import getters from '../../../../src/store/getters'
import { mockState } from '../mockState'

let state

describe('store', () => {
  beforeEach(() => {
    state = mockState()
  })

  describe('getters', () => {
    describe('rsql', () => {
      it('should transform the collection filters to rsql', () => {
        state.filters.selections.search = 'Cell&Co'
        state.filters.selections.country = ['AT', 'BE']
        state.filters.selections.covid19 = ['covid19']

        expect(getters.rsql(state)).toEqual('country=in=(AT,BE);(name=q=Cell&Co,id=q=Cell&Co,acronym=q=Cell&Co,biobank.name=q=Cell&Co,biobank.id=q=Cell&Co,biobank.acronym=q=Cell&Co)')
      })
      it('should return the empty string if no filters are selected', () => {
        expect(getters.rsql(state)).toEqual('')
      })
    })
    describe('biobankRsql', () => {
      it('should transform the biobank filters to rsql', () => {
        state.filters.selections.country = ['AT', 'BE']
        state.filters.selections.covid19 = ['covid19']

        expect(getters.biobankRsql(state)).toEqual('country=in=(AT,BE);covid19biobank==covid19')
      })
      it('should create AND filter for covid19 biobank filter values', () => {
        state.filters.selections.search = 'Cell&Co'
        state.filters.selections.covid19 = ['covid19', 'covid19a']

        expect(getters.biobankRsql(state)).toEqual('covid19biobank==covid19;covid19biobank==covid19a')
      })
      it('should return an empty string if no filters are selected', () => {
        expect(getters.biobankRsql(state)).toEqual('')
      })
    })

    describe('podium', () => {
      it('should return an array of names of collection that are present in podium', () => {
        state.isPodium = true
        state.podiumCollectionIds = ['A', 'B']
        state.collectionInfo = [{ collectionId: 'A', collectionName: 'Collection A', biobankId: 'A-1' },
          { collectionId: 'B', collectionName: 'Collection B', biobankId: 'B-1' },
          { collectionId: 'C', collectionName: 'Collection C', biobankId: 'C-1' },
          { collectionId: 'D', collectionName: 'Collection D', biobankId: 'D-1' }]
        const foundCollectionIds = ['A', 'B', 'C', 'D', 'E', 'F']

        expect(getters.collectionsInPodium(state, { foundCollectionIds })).toStrictEqual(['Collection A', 'Collection B'])
      })
    })

    describe('biobanks', () => {
      it('should return empty list when loading', () => {
        state = {}
        expect(getters.biobanks(state, { loading: true })).toStrictEqual([])
      })
      it('should look up the biobanks for matching collection ids and filter the biobank\'s collections', () => {
        state.biobanks = {
          1: { id: '1', name: 'one', collections: [{ id: 'col-1', sub_collections: [] }] },
          2: { id: '2', name: 'two', collections: [{ id: 'col-2', sub_collections: [] }, { id: 'col-3', sub_collections: [] }] }
        }
        state.biobankIds = ['1', '2']
        state.collectionInfo = [{ collectionId: 'col-2', biobankId: '2' }]
        const otherGetters = { loading: false, rsql: 'type=in=(type1)' }
        expect(getters.biobanks(state, otherGetters)).toStrictEqual([{ id: '2', name: 'two', collections: [{ id: 'col-2', sub_collections: [] }] }])
      })
      it('should return all biobanks if the collections are not filtered', () => {
        state.biobanks = {
          2: { id: '2', name: 'two', collections: [{ id: 'col-2', sub_collections: [] }] }
        }
        state.biobankIds = ['1', '2']
        state.collectionInfo = [{ collectionId: 'col-2', biobankId: '2' }]

        const otherGetters = { loading: false, rsql: '' }
        expect(getters.biobanks(state, otherGetters)).toStrictEqual([
          '1',
          { id: '2', name: 'two', collections: [{ id: 'col-2', sub_collections: [] }] }
        ])
      })
      it('should not filter out collections with matching subcollections',
        () => {
          const biobank1 = {
            id: '1',
            name: 'one',
            collections: [{ id: 'col-1', sub_collections: [] }]
          }
          const biobank2 = {
            id: '2',
            name: 'two',
            collections: [
              { id: 'col-2', sub_collections: [] },
              { id: 'col-3', sub_collections: [{ id: 'col-4', sub_collections: [] }] }]
          }
          const state = {
            biobanks: { 1: biobank1, 2: biobank2 },
            biobankIds: ['1', '2'],
            collectionInfo: [{ collectionId: 'col-4', biobankId: '2' }]
          }
          const otherGetters = { loading: false, rsql: 'type=in=(type1)' }
          expect(getters.biobanks(state, otherGetters)).toStrictEqual([{
            id: '2',
            name: 'two',
            collections: [{ id: 'col-3', sub_collections: [{ id: 'col-4', sub_collections: [] }] }]
          }])
        })

      it('should return the biobanks in the order they appear in collectionInfo', () => {
        const state = {
          biobanks: {
            1: { id: '1', name: 'B', collections: [{ id: 'col-1', sub_collections: [] }] },
            2: { id: '2', name: 'A', collections: [{ id: 'col-2', sub_collections: [] }] }
          },
          biobankIds: ['1', '2'],
          collectionInfo: [
            { collectionId: 'col-1', biobankId: '2' },
            { collectionId: 'col-2', biobankId: '1' }
          ]
        }
        const otherGetters = { loading: false, rsql: 'type=in=(type1)' }
        expect(getters.biobanks(state, otherGetters)).toStrictEqual([
          { id: '2', name: 'A', collections: [{ id: 'col-2', sub_collections: [] }] },
          { id: '1', name: 'B', collections: [{ id: 'col-1', sub_collections: [] }] }
        ])
      })
    })

    it('should return the total amount of collections for found biobanks', () => {
      const getFoundBiobankIds = ['B']
      const getCollectionsWithBiobankId = [{ collectionId: 'A', biobankId: 'B' }, { collectionId: 'C', biobankId: 'B' }, { collectionId: 'D', biobankId: 'E' }]
      const otherGetters = { getFoundBiobankIds, getCollectionsWithBiobankId }
      const ids = getters.foundCollectionIds(state, otherGetters)
      expect(ids.length).toEqual(2)
    })

    it('should return an array of biobank Ids', () => {
      const biobanks = [
        { id: '1', name: 'Biobank 1', collections: [{ id: 'col-1', sub_collections: [] }] },
        { id: '2', name: 'Biobank 2', collections: [{ id: 'col-2', sub_collections: [] }] },
        { id: '3', name: 'Biobank 3', collections: [{ id: 'col-3', sub_collections: [] }, { id: 'col-4', sub_collections: [] }] }
      ]

      const otherGetters = { biobanks }
      expect(getters.getFoundBiobankIds(state, otherGetters)).toStrictEqual(['1', '2', '3'])
    })
    it('should return an array of biobank Ids when only ids are present', () => {
      const biobanks = ['1', '2', '3']

      const otherGetters = { biobanks }
      expect(getters.getFoundBiobankIds(state, otherGetters)).toStrictEqual(['1', '2', '3'])
    })

    describe('loading', () => {
      it('should be false if both biobankIds and collectionInfo are present', () => {
        const state = {
          biobankIds: ['biobank1'],
          collectionInfo: [{ collectionId: 'col-2', biobankId: 'biobank1' }]
        }
        expect(getters.loading(state)).toBe(false)
      })

      it('should be true if biobankIds are missing', () => {
        const state = {
          biobankIds: undefined,
          collectionInfo: [{ collectionId: 'col-2', biobankId: 'biobank1' }]
        }
        expect(getters.loading(state)).toBe(true)
      })

      it('should be true if collectionInfo is missing', () => {
        const state = {
          biobankIds: ['biobank1'],
          collectionInfo: undefined
        }
        expect(getters.loading(state)).toBe(true)
      })
    })

    describe('getActiveFilters', () => {
      it('should retrieve an object of filter name <-> filters', () => {
        state.filters.selections = {
          search: 'test searchterm',
          country: ['AT'],
          materials: ['PLASMA'],
          collection_quality: ['eric'],
          biobank_quality: ['eric'],
          type: ['BIRTH_COHORT', 'CASE_CONTROL'],
          covid19: ['covid19'],
          dataType: ['BIOLOGICAL_SAMPLES', 'GENEALOGICAL_RECORDS']
        }

        const actual = getters.getActiveFilters(state)
        const expected = {
          materials: ['PLASMA'],
          country: ['AT'],
          type: ['BIRTH_COHORT', 'CASE_CONTROL'],
          covid19: ['covid19'],
          dataType: ['BIOLOGICAL_SAMPLES', 'GENEALOGICAL_RECORDS'],
          collection_quality: ['eric'],
          biobank_quality: ['eric'],
          search: 'test searchterm'
        }

        expect(actual).toStrictEqual(expected)
      })

      it('should retrieve an object of filters with diagnosis_available in it', () => {
        const expected = {
          diagnosis_available: ['urn:miriam:icd:C00-C97']
        }
        state.filters.selections = expected
        const actual = getters.getActiveFilters(state)
        expect(actual).toStrictEqual(expected)
      })
    })

    describe('showCountryFacet', () => {
      it('should return true if showCountryFacet setting is set to true', () => {
        const state = { showCountryFacet: true }
        expect(getters.showCountryFacet(state)).toEqual(true)
      })
      it('should return false if showCountryFacet setting is set to false', () => {
        const state = { showCountryFacet: false }
        expect(getters.showCountryFacet(state)).toEqual(false)
      })
    })

    describe('getErrorMessage', () => {
      it('should return undefined if no error is set', () => {
        const state = { error: undefined }
        expect(getters.getErrorMessage(state)).toEqual(undefined)
      })
      it('should return message of first error', () => {
        const state = { error: { errors: [{ message: 'this is the first error' }] } }
        expect(getters.getErrorMessage(state)).toEqual('this is the first error')
      })
      it('should return message of first error', () => {
        const state = { error: new Error('Beautiful message') }
        expect(getters.getErrorMessage(state)).toEqual('Beautiful message')
      })
      it('should return that something went wrong', () => {
        const state = { error: {} }
        expect(getters.getErrorMessage(state)).toEqual('Something went wrong')
      })
    })
  })
})
