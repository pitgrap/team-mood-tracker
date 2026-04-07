import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PollIcon from '@mui/icons-material/Poll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { getAuthToken } from './authProvider';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface QuestionStat {
  questionId: string;
  questionLabel: string;
  average: number;
  totalResponses: number;
}

interface TeamStat {
  teamId: string;
  teamName: string;
  closedSurveys: number;
  questionAverages: { questionLabel: string; average: number; totalResponses: number }[];
}

interface RecentSurvey {
  id: string;
  sprintLabel: string;
  teamName: string;
  status: string;
  submissionCount: number;
  expectedParticipants: number;
  createdAt: string;
}

interface DashboardData {
  teamCount: number;
  surveyCount: number;
  openSurveys: number;
  closedSurveys: number;
  responseCount: number;
  questionStats: QuestionStat[];
  teamStats: TeamStat[];
  recentSurveys: RecentSurvey[];
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
    </Paper>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load dashboard');
        setData(await res.json());
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Teams" value={data.teamCount} icon={<GroupIcon fontSize="large" />} color="#1976d2" />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Surveys" value={data.surveyCount} icon={<PollIcon fontSize="large" />} color="#9c27b0" />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Open" value={data.openSurveys} icon={<PendingIcon fontSize="large" />} color="#ed6c02" />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Closed" value={data.closedSurveys} icon={<CheckCircleIcon fontSize="large" />} color="#2e7d32" />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Responses" value={data.responseCount} icon={<QuestionAnswerIcon fontSize="large" />} color="#0288d1" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Overall Question Averages */}
        {data.questionStats.length > 0 && data.questionStats.some((q) => q.totalResponses > 0) && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Overall Averages (Closed Surveys)
                </Typography>
                {data.questionStats.map((q) => (
                  <Box key={q.questionId} sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {q.questionLabel}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={q.average * 10}
                        sx={{ flex: 1, height: 14, borderRadius: 1 }}
                      />
                      <Typography variant="h6" sx={{ minWidth: 48, textAlign: 'right' }}>
                        {q.average > 0 ? q.average.toFixed(2) : '—'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {q.totalResponses} responses
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Per-Team Averages */}
        {data.teamStats.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Team Averages
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Team</TableCell>
                        <TableCell align="center">Surveys</TableCell>
                        {data.questionStats.map((q) => (
                          <TableCell key={q.questionId} align="center">
                            {q.questionLabel.length > 20
                              ? q.questionLabel.substring(0, 20) + '…'
                              : q.questionLabel}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.teamStats.map((team) => (
                        <TableRow key={team.teamId}>
                          <TableCell>{team.teamName}</TableCell>
                          <TableCell align="center">{team.closedSurveys}</TableCell>
                          {team.questionAverages.map((qa, i) => (
                            <TableCell key={i} align="center">
                              {qa.totalResponses > 0 ? (
                                <Chip
                                  label={qa.average.toFixed(1)}
                                  size="small"
                                  color={qa.average >= 7 ? 'success' : qa.average >= 4 ? 'warning' : 'error'}
                                  variant="outlined"
                                />
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Surveys */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Surveys
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sprint</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Responses</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentSurveys.map((s) => (
                      <TableRow
                        key={s.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/surveys/${s.id}/show`)}
                      >
                        <TableCell>{s.sprintLabel}</TableCell>
                        <TableCell>{s.teamName}</TableCell>
                        <TableCell>
                          <Chip
                            label={s.status}
                            size="small"
                            color={s.status === 'OPEN' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {s.submissionCount} / {s.expectedParticipants}
                        </TableCell>
                        <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {data.recentSurveys.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No surveys yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
