import directives from './directives';

import action from './action';
import attachment from './attachment';
import answer from './answer';
import bot from './bot';
import contribution from './contribution';
import dataset from './dataset';
import geoData from './geoData';
import message from './message';
import project from './project';
import statistic from './statistic';
import user from './user';
import wakeUp from './wakeUp';

import query from './query';
import mutation from './mutation';
import subscribtion from './subscribtion';

const schema = `
  ${directives}
  ${action}
  ${attachment}
  ${answer}
  ${bot}
  ${contribution}
  ${dataset}
  ${geoData}
  ${message}
  ${project}
  ${statistic}
  ${user}
  ${wakeUp}
  ${query}
  ${mutation}
  ${subscribtion}
`;

export default schema;
