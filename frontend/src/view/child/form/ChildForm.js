import { Button, Form } from 'antd';
import { Formik } from 'formik';
import { i18n } from 'i18n';
import actions from 'modules/child/form/childFormActions';
import selectors from 'modules/child/form/childFormSelectors';
import model from 'modules/child/childModel';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import ViewFormItem from 'view/shared/form/items/ViewFormItem';
import Spinner from 'view/shared/Spinner';
import FormWrapper, {
  tailFormItemLayout,
} from 'view/shared/styles/FormWrapper';
import FormSchema from 'view/shared/form/formSchema';
import InputFormItem from 'view/shared/form/items/InputFormItem';
import UserAutocompleteFormItem from 'view/iam/autocomplete/UserAutocompleteFormItem';
import SelectFormItem from 'view/shared/form/items/SelectFormItem';
import authSelectors from 'modules/auth/authSelectors';

const { fields } = model;

class ChildForm extends Component {
  schema = new FormSchema(fields.id, [
    fields.owner,
    fields.name,
    fields.type,
    // fields.breed,
    fields.size,
  ]);

  componentDidMount() {
    const { dispatch, match } = this.props;

    if (this.isEditing()) {
      dispatch(actions.doFind(match.params.id));
    } else {
      dispatch(actions.doNew());
    }
  }

  isEditing = () => {
    const { match } = this.props;
    return !!match.params.id;
  };

  handleSubmit = (values) => {
    const { dispatch } = this.props;
    const { id, ...data } = this.schema.cast(values);

    if (this.isEditing()) {
      dispatch(actions.doUpdate(id, data));
    } else {
      dispatch(actions.doCreate(data));
    }
  };

  initialValues = () => {
    const record = this.props.record;

    if (this.isEditing() && record) {
      return this.schema.initialValues(record);
    }

    const initialValues = {};

    if (this.props.isChildOwner) {
      initialValues.owner = this.props.currentUser;
    }

    return this.schema.initialValues(initialValues);
  };

  renderForm() {
    const { saveLoading, isChildOwner } = this.props;

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

                {!isChildOwner && (
                  <UserAutocompleteFormItem
                    name={fields.owner.name}
                    label={fields.owner.label}
                    required={fields.owner.required}
                  />
                )}
                <InputFormItem
                  name={fields.name.name}
                  label={fields.name.label}
                  required={fields.name.required}
                />
                <SelectFormItem
                  name={fields.type.name}
                  label={fields.type.label}
                  options={fields.type.options.map(
                    (item) => ({
                      value: item.id,
                      label: item.label,
                    }),
                  )}
                  required={fields.type.required}
                />
                {/* <InputFormItem
                  name={fields.breed.name}
                  label={fields.breed.label}
                  required={fields.breed.required}
                /> */}
                <SelectFormItem
                  name={fields.size.name}
                  label={fields.size.label}
                  options={fields.size.options.map(
                    (item) => ({
                      value: item.id,
                      label: item.label,
                    }),
                  )}
                  required={fields.size.required}
                />

                <Form.Item
                  className="form-buttons"
                  {...tailFormItemLayout}
                >
                  <Button
                    loading={saveLoading}
                    type="primary"
                    htmlType="submit"
                    icon="save"
                  >
                    {i18n('common.save')}
                  </Button>

                  <Button
                    disabled={saveLoading}
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
    findLoading: selectors.selectFindLoading(state),
    saveLoading: selectors.selectSaveLoading(state),
    record: selectors.selectRecord(state),
    currentUser: authSelectors.selectCurrentUser(state),
    isChildOwner: authSelectors.selectCurrentUserIsChildOwner(
      state,
    ),
  };
}

export default connect(select)(ChildForm);
