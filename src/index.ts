import { createApp } from './app';

const PORT = process.env.PORT || 3000;
const { app } = createApp();

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Task Management System (Mini Jira / Trello LLD)`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📋 Interactive Board UI: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
