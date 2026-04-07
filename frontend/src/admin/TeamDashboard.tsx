import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import GroupIcon from '@mui/icons-material/Group';
import PollIcon from '@mui/icons-material/Poll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { getAuthToken } from './authProvider';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface QuestionResult {
  questionId: string;
  questionLabel: string;
  average: number;
  median: number;
  scores: number[];
}

interface SurveyBreakdown {
  surveyId: string;
  sprintLabel: string;
  status: string;
  expectedParticipants: number;
  submissionCount: number;
  createdAt: string;
  closedAt: string | null;
  questionResults: QuestionResult[];
}

interface TrendDataPoint {
  sprintLabel: string;
  average: number;
  closedAt: string | null;
}

interface TrendLine {
  questionId: string;
  questionLabel: string;
  dataPoints: TrendDataPoint[];
}

interface OverallAvg {
  questionId: string;
  questionLabel: string;
  average: number;
  totalResponses: number;
}

interface TeamDashboardData {
  team: { id: string; name: string; createdAt: string };
  totalSurveys: number;
  openSurveys: number;
  closedSurveys: number;
  totalResponses: number;
  overallAverages: OverallAvg[];
  trends: TrendLine[];
  surveys: SurveyBreakdown[];
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

function TrendIcon({ trend }: { trend: number }) {
  if (trend > 0.3) return <TrendingUpIcon color="success" fontSize="small" />;
  if (trend < -0.3) return <TrendingDownIcon color="error" fontSize="small" />;
  return <TrendingFlatIcon color="action" fontSize="small" />;
}

/** Simple SVG sparkline chart */
function SparklineChart({ dataPoints, color }: { dataPoints: TrendDataPoint[]; color: string }) {
  if (dataPoints.length < 2)
    return (
      <Typography variant="caption" color="text.secondary">
        Not enough data
      </Typography>
    );

  const width = 500;
  const height = 120;
  const padding = { top: 16, bottom: 24, left: 36, right: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = dataPoints.map((d) => d.average);
  const minV = Math.max(0, Math.min(...values) - 1);
  const maxV = Math.min(10, Math.max(...values) + 1);
  const range = maxV - minV || 1;

  const points = values.map((v, i) => ({
    x: padding.left + (i / (values.length - 1)) * chartW,
    y: padding.top + chartH - ((v - minV) / range) * chartH,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M ${points[0].x},${padding.top + chartH} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${padding.top + chartH} Z`;

  // Y-axis ticks
  const yTicks = [minV, (minV + maxV) / 2, maxV];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: width }}>
      {/* Grid lines */}
      {yTicks.map((t) => {
        const y = padding.top + chartH - ((t - minV) / range) * chartH;
        return (
          <g key={t}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e0e0e0"
              strokeDasharray="4 2"
            />
            <text x={padding.left - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#999">
              {t.toFixed(1)}
            </text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity={0.1} />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* Dots + labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={color} />
          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fill={color} fontWeight="bold">
            {values[i].toFixed(1)}
          </text>
          <text x={p.x} y={padding.top + chartH + 14} textAnchor="middle" fontSize={8} fill="#999">
            {dataPoints[i].sprintLabel.replace('Sprint ', 'S')}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function TeamDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TeamDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_URL}/api/admin/teams/${id}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load');
        setData(await res.json());
      } catch {
        setError('Failed to load team dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  if (error || !data) return <Alert severity="error">{error}</Alert>;

  const colors = ['#1976d2', '#e91e63'];

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Tooltip title="Back to teams">
          <IconButton onClick={() => navigate('/admin/teams')}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h4">{data.team.name}</Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Surveys"
            value={data.totalSurveys}
            icon={<PollIcon fontSize="large" />}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Closed"
            value={data.closedSurveys}
            icon={<CheckCircleIcon fontSize="large" />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Open"
            value={data.openSurveys}
            icon={<GroupIcon fontSize="large" />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Responses"
            value={data.totalResponses}
            icon={<QuestionAnswerIcon fontSize="large" />}
            color="#0288d1"
          />
        </Grid>
      </Grid>

      {/* Overall Averages */}
      {data.overallAverages.some((a) => a.totalResponses > 0) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Overall Averages
            </Typography>
            {data.overallAverages.map((q) => (
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
      )}

      {/* Trend Charts */}
      {data.trends.some((t) => t.dataPoints.length >= 2) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trend Over Sprints
            </Typography>
            {data.trends.map((trend, ti) => {
              if (trend.dataPoints.length < 2) return null;
              const lastTwo = trend.dataPoints.slice(-2);
              const trendDelta = lastTwo[1].average - lastTwo[0].average;
              return (
                <Box key={trend.questionId} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {trend.questionLabel}
                    </Typography>
                    <TrendIcon trend={trendDelta} />
                    <Typography
                      variant="caption"
                      color={
                        trendDelta > 0
                          ? 'success.main'
                          : trendDelta < 0
                            ? 'error.main'
                            : 'text.secondary'
                      }
                    >
                      {trendDelta > 0 ? '+' : ''}
                      {trendDelta.toFixed(2)} vs prev
                    </Typography>
                  </Box>
                  <SparklineChart
                    dataPoints={trend.dataPoints}
                    color={colors[ti % colors.length]}
                  />
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Sprint-by-Sprint Breakdown */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sprint Breakdown
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Sprint</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Responses</TableCell>
                  {data.overallAverages.map((q) => (
                    <TableCell key={q.questionId} align="center">
                      {q.questionLabel.length > 25
                        ? q.questionLabel.substring(0, 25) + '…'
                        : q.questionLabel}
                    </TableCell>
                  ))}
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.surveys.map((s) => (
                  <TableRow
                    key={s.surveyId}
                    hover
                    sx={{ cursor: s.status === 'CLOSED' ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (s.status === 'CLOSED') navigate(`/admin/surveys/${s.surveyId}/show`);
                    }}
                  >
                    <TableCell>{s.sprintLabel}</TableCell>
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
                    {s.questionResults.map((qr) => (
                      <TableCell key={qr.questionId} align="center">
                        {qr.scores.length > 0 ? (
                          <Chip
                            label={qr.average.toFixed(1)}
                            size="small"
                            color={
                              qr.average >= 7 ? 'success' : qr.average >= 4 ? 'warning' : 'error'
                            }
                            variant="outlined"
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      {s.closedAt
                        ? new Date(s.closedAt).toLocaleDateString()
                        : new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
