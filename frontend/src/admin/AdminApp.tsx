import { Admin, Resource } from 'react-admin';
import GroupIcon from '@mui/icons-material/Group';
import PollIcon from '@mui/icons-material/Poll';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { AdminDashboard } from './AdminDashboard';
import { TeamList, TeamCreate, TeamEdit } from './TeamResource';
import { TeamDashboard } from './TeamDashboard';
import { SurveyList, SurveyCreate, SurveyShow } from './SurveyResource';

export function AdminApp() {
  return (
    <Admin
      basename="/admin"
      authProvider={authProvider}
      dataProvider={dataProvider}
      dashboard={AdminDashboard}
      requireAuth
    >
      <Resource
        name="teams"
        list={TeamList}
        create={TeamCreate}
        edit={TeamEdit}
        show={TeamDashboard}
        icon={GroupIcon}
      />
      <Resource
        name="surveys"
        list={SurveyList}
        create={SurveyCreate}
        show={SurveyShow}
        icon={PollIcon}
      />
    </Admin>
  );
}
