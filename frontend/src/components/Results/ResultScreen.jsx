import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  Chip,
  Container,
  Divider,
  Grid,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import './ReportScreen.css'

const baseUrl = import.meta.env.VITE_API_BASE_URL || ''

const ResultScreen = () => {
  const { uuid } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${baseUrl}/document/result`, { params: { uuid } })
        setResult(response.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load results.')
        console.error('Error fetching result:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [uuid])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Typography color="error" variant="h6">{error}</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Container>
    )
  }

  if (!result) return null

  const severityColor = {
    mild: '#2e7d32',
    moderate: '#f57c00',
    severe: '#c62828',
  }[result.severity?.toLowerCase()] || '#555'

  return (
    <Container maxWidth="xl" className="results-container">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#004d40', mb: 3 }}>
        Report Results
      </Typography>

      <Grid container spacing={2}>
        {/* Left column */}
        <Grid item xs={12} md={6}>
          <Card className="result-card">
            <Typography variant="subtitle2" className="result-title">
              Uploaded File
            </Typography>
            <Typography variant="body2"><b>Filename:</b> {result.filename}</Typography>
            <Typography variant="body2">
              <b>Processed:</b> {new Date(result.processed_at).toLocaleString()}
            </Typography>
            <Typography variant="body2">
              <b>Severity:</b>{' '}
              <span style={{ color: severityColor, fontWeight: 600 }}>
                {result.severity?.charAt(0).toUpperCase() + result.severity?.slice(1)}
              </span>
            </Typography>
          </Card>

          <Card className="result-card">
            <Typography variant="subtitle2" className="result-title">
              Detected Conditions
            </Typography>
            {result.conditions?.length ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                {result.conditions.map((c, i) => (
                  <Chip
                    key={i}
                    label={
                      <Box sx={{ textAlign: 'center', lineHeight: 1.3 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{c.name}</div>
                        {c.code && <div style={{ fontSize: '0.7rem', color: '#555' }}>{c.code}</div>}
                      </Box>
                    }
                    size="medium"
                    className="result-chip"
                    sx={{ height: 'auto', py: '6px', px: '4px' }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No conditions identified.</Typography>
            )}
          </Card>
        </Grid>

        {/* Right column — summary */}
        <Grid item xs={12} md={6}>
          <Card className="result-card" sx={{ height: '100%' }}>
            <Typography variant="subtitle2" className="result-title">
              Patient Summary
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8 }}>{result.summary}</Typography>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button variant="outlined" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Box>
    </Container>
  )
}

export default ResultScreen
