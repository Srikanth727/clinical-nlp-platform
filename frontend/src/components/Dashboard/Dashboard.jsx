import axios from 'axios'
import React, { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography, Paper, List, ListItem, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { UserContext } from '../../context/UserContext'

const baseUrl = import.meta.env.VITE_API_BASE_URL || ''

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useContext(UserContext)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    axios
      .get(`${baseUrl}/document/`)
      .then((res) => setDocuments(res.data))
      .catch((err) => console.error('Error fetching documents:', err))
  }, [user, navigate])

  const handleDelete = async (e, doc) => {
    e.stopPropagation()
    if (!window.confirm(`Delete "${doc.filename}"?`)) return
    try {
      await axios.delete(`${baseUrl}/document/${doc.uuid}`)
      setDocuments((prev) => prev.filter((d) => d.uuid !== doc.uuid))
    } catch (err) {
      alert('Failed to delete document.')
      console.error(err)
    }
  }

  const handleDocClick = (doc) => {
    if (doc.status === 'processed') {
      navigate(`/results/${doc.uuid}`)
    } else {
      window.alert('This document is still being processed. Please check back shortly.')
    }
  }

  const handleUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.txt'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        const formData = new FormData()
        formData.append('file', file)
        await axios.post(`${baseUrl}/document/upload?username=${user?.name || 'anonymous'}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        alert('File uploaded successfully! Processing will begin shortly.')
        window.location.reload()
      } catch (err) {
        alert('Failed to upload file.')
        console.error(err)
      }
    }
    input.click()
  }

  return (
    <Box sx={{ width: '90%', margin: '40px auto', p: 4, background: '#fafbfc', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid #e5e7eb' }}>
        <Typography variant="h5" sx={{ color: '#23272f', fontWeight: 600 }}>
          Documents
        </Typography>
        <Button
          onClick={handleUpload}
          sx={{
            background: '#e5e7eb',
            color: '#23272f',
            borderRadius: 1,
            p: '8px 20px',
            fontWeight: 500,
            fontSize: 15,
            textTransform: 'none',
            '&:hover': { background: '#e0e7ef' },
          }}
        >
          Upload Document
        </Button>
      </Box>
      <List sx={{ width: '100%', p: 0 }}>
        {documents.length > 0 ? (
          documents.map((doc) => (
            <ListItem key={doc.uuid} disablePadding sx={{ mb: 1 }}>
              <Paper
                elevation={1}
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  border: '1px solid #e5e7eb',
                  '&:hover': { background: '#f3f4f6', cursor: 'pointer' },
                  transition: 'background 0.2s',
                }}
                onClick={() => handleDocClick(doc)}
              >
                <Box sx={{ p: '14px 20px', display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography sx={{ color: '#23272f', fontSize: 16, fontWeight: 500 }}>
                    {doc.filename}
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: 13 }}>
                    Status:{' '}
                    <span style={{ color: doc.status === 'processed' ? '#10b981' : doc.status === 'processing' ? '#f59e0b' : '#9ca3af' }}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#9ca3af', mt: 0.5 }}>
                    Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#9ca3af', mt: 0.5 }}>
                    Type: {doc.content_type.includes('pdf') ? 'PDF' : 'Text File'}
                  </Typography>
                  </Box>
                  <IconButton
                    onClick={(e) => handleDelete(e, doc)}
                    size="small"
                    sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444' }, mt: 0.5 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            </ListItem>
          ))
        ) : (
          <Typography sx={{ color: '#9ca3af', mt: 2 }}>
            No documents yet. Upload a clinical report to get started.
          </Typography>
        )}
      </List>
    </Box>
  )
}

export default Dashboard
