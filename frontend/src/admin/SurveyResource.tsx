import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  ReferenceInput,
  SelectInput,
  Show,
  SimpleShowLayout,
  required,
  useRecordContext,
  useShowContext,
} from 'react-admin';
import {
  Button,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import ContentCopy from '@mui/icons-material/ContentCopy';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from './authProvider';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function StatusField() {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Chip
      label={record.status}
      color={record.status === 'OPEN' ? 'success' : 'default'}
      size="small"
    />
  );
}

function CopyLinkButton() {
  const record = useRecordContext();
  if (!record?.participantUrl) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(record.participantUrl);
  };

  return (
    <Tooltip title="Copy participant link">
      <IconButton size="small" onClick={handleCopy}>
        <ContentCopy fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

function CloseButton() {
  const record = useRecordContext();
  const navigate = useNavigate();

  if (!record || record.status === 'CLOSED') return null;

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to close this survey?')) return;

    const token = getAuthToken();
    await fetch(`${API_URL}/api/admin/surveys/${record.id}/close`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    navigate(0); // refresh
  };

  return (
    <Button size="small" color="warning" onClick={handleClose}>
      Close
    </Button>
  );
}

export function SurveyList() {
  return (
    <List>
      <Datagrid rowClick="show">
        <TextField source="sprintLabel" label="Sprint" />
        <TextField source="teamName" label="Team" />
        <FunctionField label="Status" render={() => <StatusField />} />
        <FunctionField
          label="Responses"
          render={(record: { submissionCount?: number; expectedParticipants?: number }) =>
            `${record?.submissionCount ?? 0} / ${record?.expectedParticipants ?? '?'}`
          }
        />
        <DateField source="createdAt" label="Created" />
        <FunctionField label="Link" render={() => <CopyLinkButton />} />
        <FunctionField label="" render={() => <CloseButton />} />
      </Datagrid>
    </List>
  );
}

export function SurveyCreate() {
  return (
    <Create>
      <SimpleForm>
        <ReferenceInput source="teamId" reference="teams">
          <SelectInput optionText="name" validate={required()} fullWidth />
        </ReferenceInput>
        <TextInput source="sprintLabel" label="Sprint Label" validate={required()} fullWidth />
        <NumberInput
          source="expectedParticipants"
          label="Expected Participants"
          validate={required()}
          min={1}
          fullWidth
        />
      </SimpleForm>
    </Create>
  );
}

interface QuestionResult {
  questionId: string;
  questionLabel: string;
  average: number;
  median: number;
  scores: number[];
}

function SurveyResults() {
  const { record } = useShowContext();
  const [results, setResults] = useState<QuestionResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!record || record.status !== 'CLOSED') return;

    setLoading(true);
    const token = getAuthToken();
    fetch(`${API_URL}/api/admin/surveys/${record.id}/results`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.results) setResults(data.results);
      })
      .finally(() => setLoading(false));
  }, [record]);

  if (!record || record.status !== 'CLOSED') return null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!results) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Results
      </Typography>
      {results.map((q) => (
        <Paper key={q.questionId} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {q.questionLabel}
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, mb: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Average
              </Typography>
              <Typography variant="h6">{q.average.toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Median
              </Typography>
              <Typography variant="h6">{q.median}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Responses
              </Typography>
              <Typography variant="h6">{q.scores.length}</Typography>
            </Box>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 60 }}>Score</TableCell>
                  <TableCell sx={{ width: 60 }}>Count</TableCell>
                  <TableCell>Distribution</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                  const count = q.scores.filter((s) => s === score).length;
                  const pct = q.scores.length > 0 ? (count / q.scores.length) * 100 : 0;
                  return (
                    <TableRow key={score}>
                      <TableCell>{score}</TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 10, borderRadius: 1 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
}

export function SurveyShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="sprintLabel" label="Sprint" />
        <TextField source="teamName" label="Team" />
        <FunctionField label="Status" render={() => <StatusField />} />
        <NumberField source="expectedParticipants" label="Expected Participants" />
        <FunctionField
          label="Submissions"
          render={(record: { submissionCount?: number }) => record?.submissionCount ?? 0}
        />
        <DateField source="createdAt" label="Created" showTime />
        <DateField source="closedAt" label="Closed" showTime />
        <FunctionField
          label="Participant Link"
          render={(record: { participantUrl?: string }) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {record?.participantUrl}
              </Typography>
              <CopyLinkButton />
            </Box>
          )}
        />
        <FunctionField label="" render={() => <CloseButton />} />
      </SimpleShowLayout>
      <SurveyResults />
    </Show>
  );
}

