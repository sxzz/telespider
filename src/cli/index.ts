import { CAC } from 'cac'
import { version } from '../../package.json'

const cac = new CAC('telespider')
cac.help().version(version).parse()
