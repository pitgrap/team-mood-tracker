import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface QuestionResult {
  questionId: string;
  questionLabel: string;
  average: number;
  median: number;
  scores: number[];
}

export function ResultsPage() {
  const { token } = useParams<{ token: string }>();
  const [results, setResults] = useState<QuestionResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      try {
        const res = await fetch(`${API_URL}/api/surveys/${token}/results`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error);
          return;
        }

        setResults(data);
      } catch {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [token]);

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 8 }}>
          <Alert severity="info">{error}</Alert>
        </Box>
      </Container>
    );
  }

  if (!results) return null;

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Survey Results
        </Typography>

        {results.map((q) => (
          <Paper key={q.questionId} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {q.questionLabel}
            </Typography>

            <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Average
                </Typography>
                <Typography variant="h5">{q.average.toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Median
                </Typography>
                <Typography variant="h5">{q.median}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Responses
                </Typography>
                <Typography variant="h5">{q.scores.length}</Typography>
              </Box>
            </Box>

            {/* Score distribution */}
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
                            sx={{ height: 12, borderRadius: 1 }}
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
    </Container>
  );
}

