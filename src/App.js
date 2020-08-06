import React, {
  useState,
  useEffect,
  useReducer,
  useCallback
} from 'react'
import axios from 'axios';
import { sortBy } from 'lodash';

import './App.css';
import { ReactComponent as Check } from './check.svg';

const API_BASE = 'https://hn.algolia.com/api/v1';
const API_SEARCH = '/search';
const PARAM_SEARCH = 'query=';
const PARAM_PAGE = 'page=';

const getUrl = (query, page) => `${API_BASE}${API_SEARCH}?${PARAM_SEARCH}${query}&${PARAM_PAGE}${page}`

const useSemiPersistentState = (key, initialState) => {
  const [value, setValue] = useState(
    localStorage.getItem(key) || initialState
  )

  useEffect(() => {
    localStorage.setItem(key, value)
  }, [key, value])

  return [value, setValue]
};

const extractSearchTerm = (url) =>
  url
    .substring(url.lastIndexOf('?') + 1, url.lastIndexOf('&'))
    .replace(PARAM_SEARCH, '')

const getLastSearches = (urls) =>
  urls
    .reduce((acc, url, idx) => {
      const query = extractSearchTerm(url);
      if (idx === 0) return [...acc, query]

      const previousQuery = acc[acc.length - 1];
      return (query === previousQuery) ? acc : [...acc, query]
    }, [])
    .slice(-6)
    .slice(0, -1)
    .map(extractSearchTerm);

const LastSearches = ({ lastSearches, onLastSearch }) => {
  return (
    <>
      {lastSearches.map((query, idx) => (
        <button
          key={query + idx}
          type='button'
          onClick={() => onLastSearch(query)}
        >
          {query}
        </button>
      ))}
    </>
  );
}

const App = () => {
  const storiesReducer = (state, action) => {
    switch (action.type) {
      case 'STORIES_FETCH_INIT':
        return {
          ...state,
          isLoading: true,
          isError: false,
        }
      case 'STORIES_FETCH_SUCCESS':
        return {
          ...state,
          isLoading: false,
          isError: false,
          data:
            action.payload.page === 0
              ? action.payload.list
              : [...state.data, action.payload.list],
          page: action.payload.page,
        }
      case 'STORIES_FETCH_FAILURE':
        return {
          ...state,
          isLoading: false,
          isError: true,
        }
      case 'REMOVE_STORY':
        return {
          ...state,
          data: state.data.filter(s => s.objectID !== action.payload.objectID),
        }
      default:
        throw new Error();
    }
  };

  const [searchTerm, setSearchTerm] = useSemiPersistentState('search', 'React')
  const [urls, setUrls] = useState([getUrl(searchTerm, 0)])

  const [stories, dispatchStories] = useReducer(
    storiesReducer,
    { data: [], page: 0, isLoading: false, isError: false }
  )

  const handleFetchStories = useCallback(async () => {
    dispatchStories({ type: 'STORIES_FETCH_INIT' });

    try {
      const lastUrl = urls[urls.length - 1];
      const result = await axios.get(lastUrl);
      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: {
          list: result.data.hits,
          page: result.data.page
        }
      })
    } catch {
      dispatchStories({ type: 'STORIES_FETCH_FAILURE' })
    }
  }, [urls])

  useEffect(() => {
    handleFetchStories()
  }, [handleFetchStories])

  const handleRemoveStory = (item) => {
    dispatchStories({ type: 'REMOVE_STORY', payload: item });
  };

  const handleSearchInput = (event) => setSearchTerm(event.target.value)
  const handleSearchSubmit = (event) => {
    handleSearch(searchTerm, 0)
    event.preventDefault()
  }

  const handleLastSearch = (query) => {
    setSearchTerm(query)
    handleSearch(query, 0)
  };

  const handleSearch = (query, page) => {
    const url = getUrl(query, page)
    setUrls(urls.concat(url))
  };

  const handleMore = () => {
    const lastUrl = urls[urls.length - 1];
    const query = extractSearchTerm(lastUrl);
    handleSearch(query, stories.page + 1)
  };

  const lastSearches = getLastSearches(urls);

  return (
    <div className='container'>
      <h1 className='headline-primary'>My Hacker Stories</h1>

      <SearchForm
        searchTerm={searchTerm}
        onSearchSubmit={handleSearchSubmit}
        onSearchInput={handleSearchInput}
      />

      <LastSearches
        lastSearches={lastSearches}
        onLastSearch={handleLastSearch}
      />

      <hr />

      {stories.isError && <p>Something went wrong...</p>}

      <List list={stories.data} onRemoveItem={handleRemoveStory} />

      {stories.isLoading ? (
        <p>Loading...</p>
      ) : (
        <button type='button' onClick={handleMore}>
          More
        </button>
      )}

    </div>
  );
}

const SearchForm = ({
  searchTerm,
  onSearchInput,
  onSearchSubmit,
}) => {
  return (
    <form onSubmit={onSearchSubmit} className='search-form'>
      <InputWithLabel
        id="search"
        value={searchTerm}
        isFocused
        onInputChange={onSearchInput}
      />

      <button
        type="submit"
        disabled={!searchTerm}
        className='button button_large'
      >
        Submit
      </button>
    </form>
  );
}

const InputWithLabel = ({
  id,
  type = "text",
  value,
  onInputChange,
  isFocused,
  children,
}) => {
  return (
    <>
      <label htmlFor={id} className='label'>{children}</label>
      <input
        id={id}
        type={type}
        value={value}
        autoFocus={isFocused}
        onChange={onInputChange}
        className="input"
      />
    </>
  );
}

const SORTS = {
  NONE: list => list,
  TITLE: list => sortBy(list, 'title'),
  AUTHOR: list => sortBy(list, 'author'),
  COMMENT: list => sortBy(list, 'num_comments').reverse(),
  POINT: list => sortBy(list, 'point').reverse(),
};

const List = ({ list, onRemoveItem }) => {
  const [sort, setSort] = useState({
    sortKey: 'NONE',
    isReverse: false,
  })

  const handleSort = (sortKey) => {
    const isReverse = sort.sortKey === sortKey && !sort.isReverse;
    setSort({sortKey, isReverse});
  };

  const sortFn = SORTS[sort.sortKey];
  const sortedList = sort.isReverse
    ? sortFn(list).reverse()
    : sortFn(list)

  return (
    <div>
      <div style={{ display: 'flex' }}>
        <span style={{ width: '40%' }}>
          <button type='button' onClick={() => handleSort('TITLE')}>Title</button>
        </span>
        <span style={{ width: '30%' }}>
          <button type='button' onClick={() => handleSort('AUTHOR')}>Author</button>
        </span>
        <span style={{ width: '10%' }}>
          <button type='button' onClick={() => handleSort('COMMENT')}>Comments</button>
        </span>
        <span style={{ width: '10%' }}>
          <button type='button' onClick={() => handleSort('POINT')}>Points</button>
        </span>
        <span style={{ width: '10%' }}>Actions </span>
      </div>

      {sortedList.map(item => (
        <Item
          key={item.objectID}
          onRemoveItem={onRemoveItem}
          item={item}
        />
      ))}
    </div>
  )
}

const Item = ({ item, onRemoveItem }) => {
  const handleRemoveItem = () => onRemoveItem(item);

  return (
    <div className='item'>
      <span style={{ width: '40%' }}>
        <a href={item.url}>{item.title}</a>
      </span>
      <span style={{ width: '30%' }}>{item.author}</span>
      <span style={{ width: '10%' }}>{item.num_comments}</span>
      <span style={{ width: '10%' }}>{item.points}</span>
      <span style={{ width: '10%' }}>
        <button
          className='button button_small'
          type='button'
          onClick={handleRemoveItem}
        >
          <Check height='18px' width='18px'></Check>
        </button>
      </span>
    </div>
  );
}

export default App;
