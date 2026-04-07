import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get or create a unique participant ID for this browser session.
 * Stored in sessionStorage so it survives page reloads within the same tab,
 * but each new tab/private window gets a fresh ID.
 */
function getParticipantId(): string {
  const key = 'mood_tracker_participant_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

interface Question {
  id: string;
  label: string;
  order: number;
}

interface SurveyData {
  id: string;
  sprintLabel: string;
  teamName: string;
  status: string;
  alreadySubmitted: boolean;
  questions: Question[];
}

export function SurveyPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSurvey() {
      try {
        const participantId = getParticipantId();
        const res = await fetch(`${API_URL}/api/surveys/${token}?participantId=${participantId}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorCode(data.code);
          setError(data.error);
          return;
        }

        if (data.alreadySubmitted) {
          navigate(`/survey/${token}/submitted`, { replace: true });
          return;
        }

        if (data.status === 'CLOSED') {
          navigate(`/survey/${token}/results`, { replace: true });
          return;
        }

        setSurvey(data);
      } catch {
        setError('Failed to load survey');
      } finally {
        setLoading(false);
      }
    }
    loadSurvey();
  }, [token, navigate]);

  const allAnswered = survey ? survey.questions.every((q) => answers[q.id] !== undefined) : false;

  async function handleSubmit() {
    if (!survey || !token) return;
    setSubmitting(true);

    try {
      const responses = survey.questions.map((q) => ({
        questionId: q.id,
        score: answers[q.id],
      }));

      const res = await fetch(`${API_URL}/api/surveys/${token}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, participantId: getParticipantId() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'ALREADY_SUBMITTED') {
          navigate(`/survey/${token}/submitted`, { replace: true });
        } else if (data.code === 'SURVEY_CLOSED') {
          navigate(`/survey/${token}/results`, { replace: true });
        } else {
          setError(data.error);
        }
        return;
      }

      if (data.autoClosed) {
        navigate(`/survey/${token}/results`, { replace: true });
      } else {
        navigate(`/survey/${token}/waiting`, { replace: true });
      }
    } catch {
      setError('Failed to submit responses');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (errorCode === 'TOKEN_EXPIRED') {
    navigate(`/survey/${token}/expired`, { replace: true });
    return null;
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  if (!survey) return null;

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {survey.teamName}
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {survey.sprintLabel}
        </Typography>

        {survey.questions.map((q) => (
          <Paper key={q.id} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {q.label}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                1 = Can't be worse
              </Typography>
              <Typography variant="caption" color="text.secondary">
                10 = Can't be better
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={answers[q.id] ?? null}
              exclusive
              onChange={(_e, val) => {
                if (val !== null) setAnswers((prev) => ({ ...prev, [q.id]: val }));
              }}
              fullWidth
              sx={{ flexWrap: 'wrap' }}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <ToggleButton key={n} value={n} sx={{ flex: '1 0 auto', minWidth: 40 }}>
                  {n}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Paper>
        ))}

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!allAnswered || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      </Box>
    </Container>
  );
}

