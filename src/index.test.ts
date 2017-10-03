import { Server } from 'hapi';
import { ResourceBackend } from '@optics/prism/security';
import { ReadItem } from '@optics/prism/action';

import { ActionMapper, ActionMap } from './index';

const registerAction = jest.fn();
const registerBackend = jest.fn();

const server: Server = {
  log: jest.fn(),
  plugins: {
    'prism': {
      registerAction
    },

    'prism-security': {
      registerBackend
    }
  },
} as any;

const source = 'mockSource' as any;

afterEach(() => {
  jest.resetAllMocks();
});

describe('when actionMap is empty', () => {
  it('does nothing', () => {
    const mapper = new ActionMapper(server, source, {});

    mapper.register({
      name: 'test_table'
    } as any);

    expect(registerBackend).not.toHaveBeenCalled();
    expect(registerAction).not.toHaveBeenCalled();
  });
});

describe('when a `backend` entry is specified', () => {
  it('registers a resource backend', () => {
    const mapper = new ActionMapper(server, source, {
      test_table: {
        backend: {}
      }
    });

    mapper.register({
      name: 'test_table'
    } as any);

    expect(registerBackend).toHaveBeenCalledTimes(1);
    const backend = registerBackend.mock.calls[0][0];

    expect(backend).toBeInstanceOf(ResourceBackend);
  });

  describe('when options are specified', () => {
    it('they are passed to ResourceBackend constructor', () => {
      const mapper = new ActionMapper(server, source, {
        test_table: {
          backend: {
            options: {
              redact: '**TEST**'
            }
          }
        }
      });

      mapper.register({
        name: 'test_table'
      } as any);

      const backend = registerBackend.mock.calls[0][0];
      expect(backend._options.redact).toBe('**TEST**');
    });
  });

  describe('when merge values are specified', () => {
    it('they are merged with the ResourceBackend instance', () => {
      const mapper = new ActionMapper(server, source, {
        test_table: {
          backend: {
            merge: {
              schema: {
                $schema: 'TEST'
              } as any
            }
          }
        }
      });

      mapper.register({
        name: 'test_table'
      } as any);

      const backend = registerBackend.mock.calls[0][0];
      expect(backend.schema).toEqual({
        $schema: 'TEST'
      });
    });
  });
});

describe('when action entries are specified', () => {
  it('registers an Action', () => {
    const mapper = new ActionMapper(server, source, {
      test_table: {
        readItem: {}
      }
    });

    mapper.register({
      name: 'test_table',
      primaryKeys: ['id']
    } as any);

    expect(registerAction).toHaveBeenCalledTimes(1);
    const readItem = registerAction.mock.calls[0][0];

    expect(readItem).toBeInstanceOf(ReadItem);
  });

  describe('when options are specified', () => {
    it('they are passed to the Action constructor', () => {
      const mapper = new ActionMapper(server, source, {
        test_table: {
          readCollection: {
            options: {
              pageSize: 5
            }
          }
        }
      });

      mapper.register({
        name: 'test_table',
        primaryKeys: ['id']
      } as any);

      expect(registerAction).toHaveBeenCalledTimes(1);
      const readCollection = registerAction.mock.calls[0][0];

      expect(readCollection._options.pageSize).toBe(5);
    });
  });

  describe('when merge values are specified', () => {
    it('they are merged with the Action instance', () => {
      const mapper = new ActionMapper(server, source, {
        test_table: {
          readItem: {
            merge: {
              path: '/custom_path'
            }
          }
        }
      });

      mapper.register({
        name: 'test_table',
        primaryKeys: ['id']
      } as any);

      const readItem = registerAction.mock.calls[0][0];
      expect(readItem.path).toBe('/custom_path');
    });
  });

  describe('when `public` is `true`', () => {
    it('sets `routeConfig.auth.mode` to `optional`', () => {
      const mapper = new ActionMapper(server, source, {
        test_table: {
          readItem: {
            public: true
          }
        }
      });

      mapper.register({
        name: 'test_table',
        primaryKeys: ['id']
      } as any);

      const readItem = registerAction.mock.calls[0][0];
      expect(readItem.routeConfig).toEqual({
        auth: {
          mode: 'optional'
        }
      });
    });
  });
});

describe('when an actionMap entry is a function', () => {
  let mapEntry: jest.Mock<any>;
  let entity: any;

  beforeEach(() => {
    mapEntry = jest.fn();
    entity = {
      name: 'test_table',
      primaryKeys: ['id']
    };
  });

  it('passes the Collimator object as the first parameter', () => {
    new ActionMapper(server, source, { test_table: mapEntry }).register(entity);
    expect(mapEntry).toHaveBeenCalledWith(entity);
  });

  describe('when the actionMap function returns a falsy value', () => {
    it('does nothing', () => {
      new ActionMapper(server, source, { test_table: mapEntry }).register(entity);
      expect(registerAction).not.toHaveBeenCalled();
    });
  });

  describe('when the actionMap function returns a truthy value', () => {
    it('uses the returned value for registration', () => {
      mapEntry.mockImplementation(table => ({
        resource: {
          primaryKeys: [...entity.primaryKeys, 'extra_key']
        },
        readCollection: {}
      }));

      new ActionMapper(server, source, { test_table: mapEntry }).register(entity);
      const readCollection = registerAction.mock.calls[0][0];

      expect(readCollection._resource).toEqual({
        name: 'test_table',
        primaryKeys: ['id', 'extra_key'],
        source: 'mockSource'
      });
    });
  });
});
