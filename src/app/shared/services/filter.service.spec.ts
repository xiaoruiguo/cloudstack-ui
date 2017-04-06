import { Injector } from '@angular/core';
import { inject, TestBed, async, getTestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { ServiceLocator } from './service-locator';
import { StorageService } from './';
import { FilterConfig, FilterService } from './filter.service';


describe('Filter service', () => {
  const testKey = 'testKey';
  class RouterStub {
    public navigate(): Promise<any> {
      return Promise.resolve();
    }
  }

  class ActivateRouteStub {
    private _testQueryParams: {};
    get testParams(): {} {
      return this._testQueryParams;
    }

    set testParams(params: {}) {
      this._testQueryParams = params;
    }

    get snapshot(): {} {
      return { queryParams: this.testParams };
    }
  }

  beforeEach(async(() => {
    const storage = {};
    spyOn(localStorage, 'getItem').and.callFake(key => storage[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key, value) => storage[key] = '' + value);
    spyOn(localStorage, 'removeItem').and.callFake(key => delete storage[key]);

    TestBed.configureTestingModule({
      providers: [
        FilterService,
        { provide: ActivatedRoute, useClass: ActivateRouteStub },
        { provide: Router, useClass: RouterStub },
        StorageService,
        Injector
      ],
    });
    ServiceLocator.injector = getTestBed().get(Injector);
  }));


  it('should update filters', fakeAsync(inject([FilterService], (filterService) => {
    const params = { asd: 4, dsa: 5 };
    filterService.update(testKey, params);
    tick(5);
    expect(localStorage.getItem(testKey)).toBe(JSON.stringify(params));
  })));

  it('should not put empty arrays', fakeAsync(inject([FilterService], (filterService) => {
    const params = { asd: [], dsa: [5] };
    filterService.update(testKey, params);
    tick(5);
    expect(localStorage.getItem(testKey)).toBe(JSON.stringify({ dsa: [5] }));
  })));

  it(
    'should handle type \'boolean\' correctly',
    inject([ActivatedRoute, FilterService], (activatedRoute, filterService) => {
      const whiteList: FilterConfig = {
        'filterBool': { type: 'boolean' },
        'filterBool1': { type: 'boolean' },
        'filterBool2': { type: 'boolean' },
        'filterBool3': { type: 'boolean' },
        'filterBool4': { type: 'boolean' },
      };

      activatedRoute.testParams = {
        filterBool: true,
        filterBool1: false,
        filterBool2: 'true',
        filterBool3: 'false',
        filterBool4: 'notABoolean',
      };
      const filters = filterService.init(testKey, whiteList);
      expect(filters.filterBool).toBe(true);
      expect(filters.filterBool1).toBe(false);
      expect(filters.filterBool2).toBe(true);
      expect(filters.filterBool3).toBe(false);
      expect(filters.filterBool4).toBeUndefined();
    })
  );

  it(
    'should handle type \'string\' correctly',
    inject([ActivatedRoute, FilterService], (activatedRoute, filterService) => {
      const whiteList: FilterConfig = {
        'filterString': { type: 'string' },
        'filterString1': {
          type: 'string',
          options: ['filter1', 'filter2']
        },
        'filterString2': {
          type: 'string',
          options: ['filter1', 'filter2'],
          defaultOption: 'filter1'
        },
        'filterString3': {
          type: 'string',
          options: ['filter1', 'filter2']
        },
      };

      const testParams = {
        filterString: 'anyValue',
        filterString1: 'notFromOptions',
        filterString2: 'shouldFallbackToDefaultOption',
        filterString3: whiteList['filterString3'].options[0],
      };
      activatedRoute.testParams = testParams;
      const filters = filterService.init(testKey, whiteList);
      expect(filters.filterString).toBe(testParams.filterString);
      expect(filters.filterString1).toBeUndefined();
      expect(filters.filterString2).toBe(whiteList['filterString2'].defaultOption);
      expect(filters.filterString3).toBe(testParams.filterString3);
    })
  );

  it(
    'should handle type \'array\' correctly',
    inject([ActivatedRoute, FilterService], (activatedRoute, filterService) => {
      const whiteList: FilterConfig = {
        'serializedArray': { type: 'array' },
        'array': { type: 'array' },
        'withOptions': {
          type: 'array',
          options: ['option1', 'option2']
        },
        'intersection': {
          type: 'array',
          options: ['option1', 'option2']
        },
        'unknownValue': {
          type: 'array',
          options: ['option1', 'option2']
        },
        'notAnArray': {
          type: 'array'
        }
      };

      activatedRoute.testParams = {
        serializedArray: 'anyValue,anotherValue',
        array: ['anyValue', 'anotherValue'],
        withOptions: 'option2',
        intersection: 'option2,option3',
        unknownValue: 'option3',
        notAnArray: 123
      };
      const filters = filterService.init(testKey, whiteList);
      expect(filters.serializedArray).toEqual(['anyValue', 'anotherValue']);
      expect(filters.array).toEqual(['anyValue', 'anotherValue']);
      expect(filters.withOptions).toEqual(['option2']);
      expect(filters.notAnArray).toBeUndefined();
      expect(filters.intersection).toEqual(['option2']);
    })
  );

  it(
    'should not return missing filters',
    inject([ActivatedRoute, FilterService], (activatedRoute, filterService) => {
      const whiteList: FilterConfig = {
        'filter1': {
          type: 'string'
        },
        'filter2': {
          type: 'array'
        }
      };

      const queryParams = { filter1: 'privet' };
      activatedRoute.testParams = queryParams;
      const filters = filterService.init(testKey, whiteList);
      expect(filters).toEqual(queryParams);
    })
  );

  it(
    'should get missing filters from localStorage',
    inject([ActivatedRoute, FilterService], (activatedRoute, filterService) => {
      const whiteList: FilterConfig = {
        'filter1': {
          type: 'string'
        },
        'filter2': {
          type: 'array'
        }
      };

      const queryParams = { filter1: 'privet' };
      const storageFilters = { filter2: ['asd', 'dsa'] };
      localStorage.setItem(testKey, JSON.stringify(storageFilters));
      activatedRoute.testParams = queryParams;
      const filters = filterService.init(testKey, whiteList);
      expect(filters).toEqual(Object.assign({}, queryParams, storageFilters));
    })
  );

  it(
    'should ignore invalid JSON from localStorage',
    inject([ActivatedRoute, FilterService], (activatedRoute, filterService) => {
      const whiteList: FilterConfig = {
        'filter1': {
          type: 'string'
        },
        'filter2': {
          type: 'array'
        }
      };

      const queryParams = { filter1: 'privet' };
      localStorage.setItem(testKey, 'invalidJSON');
      activatedRoute.testParams = queryParams;
      const filters = filterService.init(testKey, whiteList);
      expect(filters).toEqual(queryParams);
      expect(localStorage.getItem(testKey)).toBeNull();
    })
  );

  it(
    'should return default option if requested filter is not present in url or localStorage',
    inject([ActivatedRoute, FilterService], (activatedRoute, filterService) => {
      const whiteList: FilterConfig = {
        'filter': { type: 'string', defaultOption: 'default' }
      };

      localStorage.setItem(testKey, JSON.stringify({ asd: 5 }));
      activatedRoute.testParams = { unknownFilter: 5 };
      const filters = filterService.init(testKey, whiteList);
      expect(filters).toEqual({ filter: 'default' });
    })
  );

  it(
    'should not lookup localStorage if all params are set in the url',
    inject([ActivatedRoute, FilterService], (activatedRoute, filterService) => {
      const whiteList: FilterConfig = {
        'filter': { type: 'string', defaultOption: 'default' },
        'filter1': { type: 'boolean' }
      };

      localStorage.setItem(testKey, JSON.stringify({
        filter: 'fromStorage',
        filter1: false
      }));
      const urlParams = {
        filter: 'fromUrl',
        filter1: true
      };
      activatedRoute.testParams = urlParams;
      const filters = filterService.init(testKey, whiteList);
      expect(filters).toEqual(urlParams);
    })
  );
});