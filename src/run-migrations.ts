// import AppDataSource from './data-source';

// async function runMigrations() {
//   try {
//     console.log('Connecting to database...');
//     await AppDataSource.initialize();
//     console.log('✅ DB connected!');

//     const migrations = await AppDataSource.showMigrations();
//     if (!migrations) {
//       console.log('⚡ No pending migrations. Nothing to run.');
//       return;
//     }

//     console.log('Running migrations...');
//     await AppDataSource.runMigrations();
//     console.log('✅ Migrations complete!');
//   } catch (err) {
//     console.error('❌ Migration failed:', err);
//   } finally {
//     await AppDataSource.destroy();
//     console.log('Connection closed.');
//   }
// }

// runMigrations();
