import { initDB } from '@/utils/db';

export async function initializeApp() {
  try {
    await initDB();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
