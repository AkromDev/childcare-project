import { Button, Form } from 'antd';
import { Formik } from 'formik';
import { i18n } from 'i18n';
import actions from 'modules/booking/form/bookingFormActions';
import selectors from 'modules/booking/form/bookingFormSelectors';
import model from 'modules/booking/bookingModel';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import ViewFormItem from 'view/shared/form/items/ViewFormItem';
import Spinner from 'view/shared/Spinner';
import FormWrapper, {
  tailFormItemLayout,
} from 'view/shared/styles/FormWrapper';
import FormSchema from 'view/shared/form/formSchema';
import TextAreaFormItem from 'view/shared/form/items/TextAreaFormItem';
import InputFormItem from 'view/shared/form/items/InputFormItem';
import UserAutocompleteFormItem from 'view/iam/autocomplete/UserAutocompleteFormItem';
import SelectFormItem from 'view/shared/form/items/SelectFormItem';
import DatePickerFormItem from 'view/shared/form/items/DatePickerFormItem';
import ImagesFormItem from 'view/shared/form/items/ImagesFormItem';
import FilesFormItem from 'view/shared/form/items/FilesFormItem';
import ChildAutocompleteFormItem from 'view/child/autocomplete/ChildAutocompleteFormItem';
import authSelectors from 'modules/auth/authSelectors';
import bookingStatus from 'modules/booking/bookingStatus';
import UserViewItem from 'view/iam/view/UserViewItem';
import ChildViewItem from 'view/child/view/ChildViewItem';
import DatePickerRangeFormItem from 'view/shared/form/items/DatePickerRangeFormItem';
import settingsActions from 'modules/settings/settingsActions';
import settingsSelectors from 'modules/settings/settingsSelectors';
import BookingFeeCalculator from 'modules/booking/bookingFeeCalculator';

const { fields } = model;

class BookingForm extends Component {
  schema = new FormSchema(fields.id, [
    fields.owner,
    fields.child,
    fields.arrival,
    fields.departure,
    fields.clientNotes,
    fields.employeeNotes,
    fields.photos,
    fields.status,
    fields.cancellationNotes,
    fields.fee,
    fields.receipt,
    fields.period,
  ]);

  componentDidMount() {
    const { dispatch, match } = this.props;

    dispatch(settingsActions.doFind());

    if (this.isEditing()) {
      dispatch(actions.doFind(match.params.id));
    } else {
      dispatch(actions.doNew());
    }
  }

  isOwnerEnabled = () => {
    const { isChildOwner, isManager, record } = this.props;

    if (isManager) {
      return true;
    }

    if (isChildOwner) {
      return false;
    }

    if (!this.isEditing()) {
      return true;
    }

    if (!record || !record.status) {
      return false;
    }

    return record.status === bookingStatus.BOOKED;
  };

  isOwnerVisible = () => {
    return !this.isOwnerEnabled() && this.props.record;
  };

  isChildEnabled = (form) => {
    if (!form.values.owner) {
      return false;
    }

    if (!this.isEditing()) {
      return true;
    }

    const { record, isManager } = this.props;

    if (isManager) {
      return true;
    }

    if (!record || !record.status) {
      return false;
    }

    return record.status === bookingStatus.BOOKED;
  };

  isChildVisible = (form) => {
    return !this.isChildEnabled(form) && form.values.child;
  };

  isEditing = () => {
    const { match } = this.props;
    return !!match.params.id;
  };

  isStatusEnabled = () => {
    const { isChildOwner } = this.props;

    if (this.isEditing()) {
      return true;
    }

    return !isChildOwner;
  };

  isEmployeeNotesAndPhotosEnabled = (form) => {
    if (this.props.isManager) {
      return true;
    }

    return form.values.status === bookingStatus.PROGRESS;
  };

  isCancellationNotesEnabled = (form) => {
    if (this.props.isManager) {
      return true;
    }

    return form.values.status === bookingStatus.CANCELLED;
  };

  isReceiptEnabled = (form) => {
    if (this.props.isManager) {
      return true;
    }

    return form.values.status === bookingStatus.COMPLETED;
  };

  isFeeVisible = (form) => {
    return form.values.fee;
  };

  statusOptions = () => {
    const {
      isChildOwner,
      isManager,
      isEmployee,
    } = this.props;

    if (isChildOwner) {
      return this.statusOptionsChildOwner();
    }

    if (isEmployee) {
      return this.statusOptionsEmployee();
    }

    if (isManager) {
      return this.statusOptionsManager();
    }
  };

  statusOptionsManager = () => {
    return fields.status.options;
  };

  statusOptionsEmployee = () => {
    const { record } = this.props;
    const options = fields.status.options;

    if (!this.isEditing()) {
      return options;
    }

    if (record.status === bookingStatus.BOOKED) {
      return options;
    }

    return options.filter(
      (option) => option.id !== bookingStatus.BOOKED,
    );
  };

  statusOptionsChildOwner = () => {
    return fields.status.options.filter((option) => {
      return [
        bookingStatus.BOOKED,
        bookingStatus.CANCELLED,
      ].includes(option.id);
    });
  };

  handleSubmit = (values) => {
    const { dispatch } = this.props;
    const { id, ...data } = this.schema.cast(values);
    delete data.period;

    if (this.isEditing()) {
      dispatch(actions.doUpdate(id, data));
    } else {
      dispatch(actions.doCreate(data));
    }
  };

  initialValues = () => {
    const record = this.props.record;

    if (this.isEditing() && record) {
      record.period = [record.arrival, record.departure];
      return this.schema.initialValues(record);
    }

    const initialValues = {
      status: bookingStatus.BOOKED,
    };

    if (this.props.isChildOwner) {
      initialValues.owner = this.props.currentUser;
    }

    return this.schema.initialValues(initialValues);
  };

  onPeriodChange(value, form) {
    form.setFieldTouched('period');
    form.setFieldValue('period', value);
    form.setFieldValue('arrival', value[0]);
    form.setFieldValue('departure', value[1]);
    this.calculateAndSetFee(value[0], value[1], form);
  }

  calculateAndSetFee = (arrival, departure, form) => {
    const { dailyFee } = this.props;

    const fee = BookingFeeCalculator.calculate(
      arrival,
      departure,
      dailyFee,
    );

    form.setFieldValue('fee', fee);
  };

  renderForm() {
    const { saveLoading, record } = this.props;

    return (
      <FormWrapper>
        <Formik
          initialValues={this.initialValues()}
          validationSchema={this.schema.schema}
          onSubmit={this.handleSubmit}
          render={(form) => {
            return (
              <Form onSubmit={form.handleSubmit}>
                {this.isEditing() && (
                  <ViewFormItem
                    name={fields.id.name}
                    label={fields.id.label}
                  />
                )}

                {this.isOwnerEnabled() && (
                  <UserAutocompleteFormItem
                    name={fields.owner.name}
                    label={fields.owner.label}
                    required={fields.owner.required}
                  />
                )}

                {this.isOwnerVisible() && (
                  <UserViewItem
                    label={fields.owner.label}
                    value={fields.owner.forView(
                      record.owner,
                    )}
                  />
                )}

                {this.isChildEnabled(form) && (
                  <ChildAutocompleteFormItem
                    name={fields.child.name}
                    label={fields.child.label}
                    required={fields.child.required}
                    owner={
                      form.values.owner
                        ? form.values.owner.id
                        : null
                    }
                  />
                )}

                {this.isChildVisible(form) && (
                  <ChildViewItem
                    label={fields.child.label}
                    value={fields.child.forView(
                      record.child,
                    )}
                  />
                )}

                <DatePickerRangeFormItem
                  name={fields.period.name}
                  label={fields.period.label}
                  required={fields.period.required}
                  showTime
                  inputProps={{
                    onChange: (value) => {
                      this.onPeriodChange(value, form);
                    },
                  }}
                />

                <TextAreaFormItem
                  name={fields.clientNotes.name}
                  label={fields.clientNotes.label}
                  required={fields.clientNotes.required}
                />
                {this.isEmployeeNotesAndPhotosEnabled(
                  form,
                ) && (
                  <React.Fragment>
                    <TextAreaFormItem
                      name={fields.employeeNotes.name}
                      label={fields.employeeNotes.label}
                      required={
                        fields.employeeNotes.required
                      }
                    />
                    <ImagesFormItem
                      name={fields.photos.name}
                      label={fields.photos.label}
                      required={fields.photos.required}
                      path={fields.photos.path}
                      schema={{
                        size: fields.photos.size,
                      }}
                      max={fields.photos.max}
                    />
                  </React.Fragment>
                )}
                {this.isStatusEnabled() && (
                  <SelectFormItem
                    name={fields.status.name}
                    label={fields.status.label}
                    options={this.statusOptions().map(
                      (item) => ({
                        value: item.id,
                        label: item.label,
                      }),
                    )}
                    required={fields.status.required}
                  />
                )}
                {this.isCancellationNotesEnabled(form) && (
                  <TextAreaFormItem
                    name={fields.cancellationNotes.name}
                    label={fields.cancellationNotes.label}
                    required={
                      fields.cancellationNotes.required
                    }
                  />
                )}
                {this.isFeeVisible(form) && (
                  <ViewFormItem
                    name={fields.fee.name}
                    label={fields.fee.label}
                    required={fields.fee.required}
                    formatter={fields.fee.forView}
                  />
                )}
                {this.isReceiptEnabled(form) && (
                  <FilesFormItem
                    name={fields.receipt.name}
                    label={fields.receipt.label}
                    required={fields.receipt.required}
                    path={fields.receipt.path}
                    schema={{
                      size: fields.receipt.size,
                      formats: fields.receipt.formats,
                    }}
                    max={fields.receipt.max}
                  />
                )}

                <Form.Item
                  className="form-buttons"
                  {...tailFormItemLayout}
                >
                  <Button
                    loading={
                      saveLoading || form.isSubmitting
                    }
                    type="primary"
                    htmlType="submit"
                    icon="save"
                  >
                    {i18n('common.save')}
                  </Button>

                  <Button
                    disabled={
                      saveLoading || form.isSubmitting
                    }
                    onClick={form.handleReset}
                    icon="undo"
                  >
                    {i18n('common.reset')}
                  </Button>
                </Form.Item>
              </Form>
            );
          }}
        />
      </FormWrapper>
    );
  }

  render() {
    const { findLoading, record } = this.props;

    if (findLoading) {
      return <Spinner />;
    }

    if (this.isEditing() && !record) {
      return <Spinner />;
    }

    return this.renderForm();
  }
}

function select(state) {
  return {
    findLoading:
      selectors.selectFindLoading(state) ||
      settingsSelectors.selectFindLoading(state),
    saveLoading: selectors.selectSaveLoading(state),
    record: selectors.selectRecord(state),
    currentUser: authSelectors.selectCurrentUser(state),
    isChildOwner: authSelectors.selectCurrentUserIsChildOwner(
      state,
    ),
    isEmployee: authSelectors.selectCurrentUserIsEmployee(
      state,
    ),
    isManager: authSelectors.selectCurrentUserIsManager(
      state,
    ),
    dailyFee: settingsSelectors.selectDailyFee(state),
  };
}

export default connect(select)(BookingForm);
