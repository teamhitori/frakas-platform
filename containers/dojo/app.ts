import { gameConnectionService } from './components/gameConnectionService'
import { setSecerets } from './components/debug'

var go = async () => {

    await setSecerets();

    new gameConnectionService();
}

go();

