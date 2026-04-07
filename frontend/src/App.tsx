import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Typography, Container, Box } from '@mui/material';
import { AdminApp } from './admin';
import { SurveyPage, ResultsPage, WaitingPage, SubmittedPage, ExpiredPage } from './survey';

function Home() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Team Mood Tracker
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your team's mood at the end of each sprint.
        </Typography>
      </Box>
    </Container>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/survey/:token" element={<SurveyPage />} />
        <Route path="/survey/:token/waiting" element={<WaitingPage />} />
        <Route path="/survey/:token/submitted" element={<SubmittedPage />} />
        <Route path="/survey/:token/expired" element={<ExpiredPage />} />
        <Route path="/survey/:token/results" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
