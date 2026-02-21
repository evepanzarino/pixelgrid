const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all items
router.get('/', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM items');
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get item by ID
router.get('/:id', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM items WHERE id = ?', [req.params.id]);
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create item
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const connection = await db.getConnection();
    const [result] = await connection.query('INSERT INTO items (name, description) VALUES (?, ?)', [name, description]);
    connection.release();
    
    res.status(201).json({ id: result.insertId, name, description });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const connection = await db.getConnection();
    await connection.query('UPDATE items SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
    connection.release();
    
    res.json({ id: req.params.id, name, description });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const connection = await db.getConnection();
    await connection.query('DELETE FROM items WHERE id = ?', [req.params.id]);
    connection.release();
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
