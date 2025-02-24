import { CAC } from 'cac'
import { version } from '../../package.json'
import { ENTITY_TYPES } from '../core/utils'
import { meta } from './commands/meta'
import { msg } from './commands/msg'
import { watch } from './commands/watch'

const cli = new CAC('telespider')

cli
  .option('--type <type>', `Filter entity type: ${ENTITY_TYPES.join(', ')}`, {
    default: 'all',
  })
  .command('')
  .action(msg)
cli.command('meta').action(meta)
cli.command('watch').action(watch)

cli.version(version).help().parse()
