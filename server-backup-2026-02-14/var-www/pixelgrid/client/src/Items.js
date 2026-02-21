import React, { useState, useEffect } from 'react';
import { itemAPI } from './api';
import './Items.css';

function Items() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await itemAPI.getAll();
      setItems(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Name is required');
      return;
    }

    try {
      await itemAPI.create({ name, description });
      setName('');
      setDescription('');
      fetchItems();
      setError('');
    } catch (err) {
      setError('Failed to add item');
      console.error(err);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await itemAPI.delete(id);
      fetchItems();
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
    }
  };

  return (
    <div className="items-container">
      <h1>Items Management</h1>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleAddItem} className="item-form">
        <input
          type="text"
          placeholder="Item Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Add Item</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="items-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.description || '-'}</td>
                <td>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Items;
