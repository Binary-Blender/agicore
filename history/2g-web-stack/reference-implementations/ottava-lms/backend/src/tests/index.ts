import { runVisualHelperTests } from './visualHelpers.test';
import { runPlaylistHelperTests } from './playlistHelpers.test';

const main = async () => {
  runVisualHelperTests();
  runPlaylistHelperTests();
  console.log('✅ Visual helper tests passed');
  console.log('✅ Playlist helper tests passed');
};

main().catch((error) => {
  console.error('❌ Tests failed', error);
  process.exit(1);
});
