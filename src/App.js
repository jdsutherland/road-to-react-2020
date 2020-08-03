import React, { useState, useEffect, useReducer } from 'react'

const useSemiPersistentState = (key, initialState) => {
  const [value, setValue] = useState(
    localStorage.getItem(key) || initialState
  )

  useEffect(() => {
    localStorage.setItem(key, value)
  }, [key, value])

  return [value, setValue]
};

const initialStories = [
  {
    title: 'React',
    url: 'https://reactjs.org/',
    author: 'Jordan Walke',
    num_comments: 3,
    points: 4,
    objectID: 0,
  },
  {
    title: 'Redux',
    url: 'https://redux.js.org/',
    author: 'Dan Abramov, Andrew Clark',
    num_comments: 2,
    points: 5,
    objectID: 1,
  },
];

const getAsyncStories = () => {
  return new Promise(resolve => {
    setTimeout(
      () => resolve({ data: { stories: initialStories } })
    , 2000)
  })
}

const App = () => {
  const storiesReducer = (state, action) => {
    switch (action.type) {
      case 'SET_STORIES':
        return action.payload;
      case 'REMOVE_STORY':
        return state.filter(s => s.objectID !== action.payload.objectID);
      default:
        throw new Error();
    }
  };

  const [searchTerm, setSearchTerm] = useSemiPersistentState('search', 'React')
  const [stories, dispatchStories] = useReducer(storiesReducer, [])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    getAsyncStories()
      .then(result => {
        dispatchStories({
          type: 'SET_STORIES',
          payload: result.data.stories
        })
        setIsLoading(false)
      })
      .catch(() => setIsError(true))
  }, [])

  const handleRemoveStory = (item) => {
    dispatchStories({
      type: 'SET_STORIES',
      payload: item
    });
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
  }

  const searchedStories = stories.filter(story =>
    story.title
    .toLowerCase()
    .includes(searchTerm.toLowerCase()));

  return (
    <div>
      <h1>My Hacker Stories</h1>

      <InputWithLabel
        id="search"
        value={searchTerm}
        onInputChange={handleSearch}
        isFocused
      />
      <strong>Search:</strong>

      <hr />

      {isError && <p>Something went wrong...</p>}

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <List
          list={searchedStories}
          onRemoveItem={handleRemoveStory}
        />
      )}
    </div>
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
      <label htmlFor={id}>{children}</label>
      <input
        id={id}
        type={type}
        value={value}
        autoFocus={isFocused}
        onChange={onInputChange}
      />
    </>
  );
}

const List = ({ list, onRemoveItem }) =>
  list.map(item => (
    <Item
      key={item.objectID}
      onRemoveItem={onRemoveItem}
      item={item}
    />
  ))

const Item = ({ item, onRemoveItem }) => {
  const handleRemoveItem = () => onRemoveItem(item);

  return (
    <div>
      <span>
        <a href={item.url}>{item.title}</a>
      </span>
      <span>{item.author}</span>
      <span>{item.num_comments}</span>
      <span>{item.points}</span>
      <span>
        <button type='button' onClick={handleRemoveItem}>
          Dismiss
        </button>
      </span>
    </div>
  );
}

export default App;
