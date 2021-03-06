import { Schema, QueryBuilder, buildQuery } from '@orbit/data';
import { QueryOperators } from '../../src/lib/query-operators';
import JSONAPIRequestProcessor from '../../src/jsonapi-request-processor';
import { SinonStatic, SinonStub } from 'sinon';
import { jsonapiResponse } from '../support/jsonapi';

declare const sinon: SinonStatic;
const { module, test } = QUnit;

module('QueryOperators', function(hooks) {
  let schema: Schema;
  let requestProcessor: JSONAPIRequestProcessor;
  let qb: QueryBuilder;
  let fetchStub: SinonStub;

  hooks.beforeEach(() => {
    fetchStub = sinon.stub(self, 'fetch');

    schema = new Schema({
      models: {
        planet: {
          keys: {
            remoteId: {}
          },
          attributes: {
            name: { type: 'string' },
            classification: { type: 'string' },
            lengthOfDay: { type: 'number' }
          },
          relationships: {
            moons: { type: 'hasMany', model: 'moon', inverse: 'planet' },
            solarSystem: {
              type: 'hasOne',
              model: 'solarSystem',
              inverse: 'planets'
            }
          }
        },
        moon: {
          keys: {
            remoteId: {}
          },
          attributes: {
            name: { type: 'string' }
          },
          relationships: {
            planet: { type: 'hasOne', model: 'planet', inverse: 'moons' }
          }
        },
        solarSystem: {
          keys: {
            remoteId: {}
          },
          attributes: {
            name: { type: 'string' }
          },
          relationships: {
            planets: {
              type: 'hasMany',
              model: 'planet',
              inverse: 'solarSystem'
            }
          }
        }
      }
    });

    requestProcessor = new JSONAPIRequestProcessor({
      keyMap: null,
      schema,
      sourceName: 'foo'
    });

    qb = new QueryBuilder();
  });

  hooks.afterEach(() => {
    schema = requestProcessor = null;
    fetchStub.restore();
  });

  test('meta and links', async function(assert) {
    fetchStub.withArgs('/planets').returns(
      jsonapiResponse(200, {
        data: [
          {
            type: 'planets',
            id: 'jupiter',
            attributes: { name: 'Jupiter' }
          }
        ],
        meta: {
          important: true
        },
        links: {
          self: 'https://api.example.com/self',
          related: {
            href: 'https://api.example.com/related',
            meta: {
              important: true
            }
          }
        }
      })
    );

    const query = buildQuery(qb.findRecords('planet'));

    const response = await QueryOperators[query.expression.op](
      requestProcessor,
      query
    );
    const {
      transforms: [{ id: transformId }]
    } = response;

    assert.deepEqual(response, {
      meta: {
        important: true
      },
      links: {
        self: 'https://api.example.com/self',
        related: {
          href: 'https://api.example.com/related',
          meta: {
            important: true
          }
        }
      },
      primaryData: [
        {
          attributes: {
            name: 'Jupiter'
          },
          id: 'jupiter',
          type: 'planet'
        }
      ],
      transforms: [
        {
          id: transformId,
          operations: [
            {
              op: 'updateRecord',
              record: {
                type: 'planet',
                id: 'jupiter',
                attributes: { name: 'Jupiter' }
              }
            }
          ],
          options: undefined
        }
      ]
    });
  });
});
