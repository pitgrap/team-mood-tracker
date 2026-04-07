import { Container, Box, Typography, Paper } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export function WaitingPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <HourglassEmptyIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Thank you!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Waiting for all responses. Results will be available once everyone has submitted.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

export function SubmittedPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Already Submitted
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You have already submitted your answers for this survey.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

export function ExpiredPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Link Expired
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This survey link has expired. Please contact your team admin for a new link.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
