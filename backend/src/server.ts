import { createApp } from './app';
import { validateEnv } from './config';

const config = validateEnv();
const app = createApp(config);

const PORT = config.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
