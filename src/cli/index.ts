import { CAC } from 'cac'
import { version } from '../../package.json'
import { meta } from './commands/meta'
import { msg } from './commands/msg'
import { watch } from './commands/watch'

const cli = new CAC('telespider')

cli.command('').action(msg)
cli.command('meta').action(meta)
cli.command('watch').action(watch)

cli.version(version).help().parse()
