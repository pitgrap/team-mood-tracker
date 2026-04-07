import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  DeleteButton,
  Create,
  Edit,
  SimpleForm,
  TextInput,
  required,
} from 'react-admin';

export function TeamList() {
  return (
    <List>
      <Datagrid>
        <TextField source="name" />
        <DateField source="createdAt" label="Created" />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}

export function TeamCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
      </SimpleForm>
    </Create>
  );
}

export function TeamEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
      </SimpleForm>
    </Edit>
  );
}

