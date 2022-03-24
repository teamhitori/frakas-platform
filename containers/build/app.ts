import express from 'express';
import { CompilerService } from './components/CompilerService'
import { setSecerets } from './components/debug'

var go = async () => {

    await setSecerets()

    const port: string | number = process.env.port || 80;

    const app = express();

    app.listen(port);

    console.log(`Opening Express on port ${port}`);

    new CompilerService(app);

}

go();


