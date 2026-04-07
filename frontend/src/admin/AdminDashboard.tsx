import { Card, CardContent, Typography, Box } from '@mui/material';

export function AdminDashboard() {
  return (
    <Card>
      <CardContent>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Team Mood Tracker
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Admin Dashboard
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Welcome! Use the menu to manage teams and surveys.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
