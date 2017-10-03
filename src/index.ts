import { Server } from 'hapi';

import { TableDescription } from 'collimator/lib/inspectors/tables';
import { ViewDescription } from 'collimator/lib/inspectors/views';
import { ExtendedTableDescription, ExtendedViewDescription } from 'collimator';

import { Source } from '@optics/prism/source';
import { Resource } from '@optics/prism/resource';

import { Action, ReadItem, ReadCollection, CreateItem, UpdateItem, DeleteItem } from '@optics/prism/action';
import { Options as ReadCollectionOptions } from '@optics/prism/action/ReadCollection';
import {
  Resource as ResourceBackend,
  Options as ResourceBackendOptions
} from '@optics/prism/security/backend/Resource';

export type Table = TableDescription & ExtendedTableDescription;
export type View = ViewDescription & ExtendedViewDescription;

export interface ResourceBackendConfiguration {
  merge: Partial<ResourceBackend>;
  options: Partial<ResourceBackendOptions>;
}

export interface ActionConfiguration {
  public: boolean;
  merge: Partial<Action>;
  options: any;
}

export interface ActionMapEntry {
  resource: Partial<Resource>;

  readCollection: Partial<ActionConfiguration> & Partial<{
    options: Partial<ReadCollectionOptions>;
  }>;

  readItem: Partial<ActionConfiguration>;
  createItem: Partial<ActionConfiguration>;
  updateItem: Partial<ActionConfiguration>;
  deleteItem: Partial<ActionConfiguration>;

  backend: Partial<ResourceBackendConfiguration>;
}

export type ActionMapEntryKey = 'readItem' | 'readCollection' | 'createItem' | 'updateItem' | 'deleteItem';

export interface ActionMap {
  [tableName: string]: Partial<ActionMapEntry> | ((entity: Table | View) => Partial<ActionMapEntry>);
}

export class ActionMapper {
  constructor(protected _server: Server, protected _source: Source, protected _actionMap: ActionMap) { }

  register(entity: Table | View) {
    let mapEntry = this._actionMap[entity.name];

    if (typeof mapEntry === 'function') {
      mapEntry = mapEntry(entity);
    }

    if (!mapEntry) {
      return;
    }

    const resource = {
      ...entity as Table,
      ...mapEntry.resource,
      source: this._source
    };

    this._registerBackend(resource, mapEntry);
    this._registerAction(resource, mapEntry, 'readItem', ReadItem);
    this._registerAction(resource, mapEntry, 'readCollection', ReadCollection);
    this._registerAction(resource, mapEntry, 'createItem', CreateItem);
    this._registerAction(resource, mapEntry, 'updateItem', UpdateItem);
    this._registerAction(resource, mapEntry, 'deleteItem', DeleteItem);
  }

  protected _registerBackend(resource: Resource, mapEntry: Partial<ActionMapEntry>) {
    if (!mapEntry.backend) {
      return;
    }

    this._server.log('info', `Registering security backend on resource '${resource.name}`);

    const backend = new ResourceBackend(resource, mapEntry.backend.options);
    Object.assign(backend, mapEntry.backend.merge);

    this._server.plugins['prism-security'].registerBackend(backend);
  }

  protected _registerAction<K extends ActionMapEntryKey>(
    resource: Resource,
    mapEntry: Partial<ActionMapEntry>,
    key: K,
    ActionClass: new (...args: any[]) => Action
  ) {
    const config = mapEntry[key];

    if (!config) {
      return;
    }

    this._server.log('info', `Registering action '${key}' on resource '${resource.name}'`);

    const action = new ActionClass(resource, config.options);

    Object.assign(action, config.merge);

    if (config.public) {
      Object.assign(action, {
        routeConfig: {
          auth: {
            mode: 'optional'
          }
        }
      });
    }

    this._server.plugins.prism.registerAction(action);
  }
}
