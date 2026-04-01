/**
 * Tests for DataTable component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from '../components/DataTable.jsx'

const COLUMNS = [
  { key: 'Word', label: 'Word', sortable: true, editable: true },
  { key: 'Level', label: 'Level', sortable: true, editable: false },
  { key: 'Meaning', label: 'Meaning', sortable: false, editable: true },
]

const ROWS = [
  { Word: 'Hund', Level: 'A1', Meaning: 'dog' },
  { Word: 'Katze', Level: 'B1', Meaning: 'cat' },
  { Word: 'Haus', Level: 'A2', Meaning: 'house' },
]

describe('DataTable', () => {
  it('renders correct number of rows from data', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />)
    // 3 data rows
    expect(screen.getByText('Hund')).toBeTruthy()
    expect(screen.getByText('Katze')).toBeTruthy()
    expect(screen.getByText('Haus')).toBeTruthy()
  })

  it('shows empty state message when rows is empty', () => {
    render(<DataTable columns={COLUMNS} rows={[]} />)
    expect(screen.getByText(/No entries yet/i)).toBeTruthy()
  })

  it('shows loading indicator when loading=true', () => {
    render(<DataTable columns={COLUMNS} rows={[]} loading={true} />)
    expect(screen.getByText(/Loading/i)).toBeTruthy()
  })

  it('search input filters rows to matching entries', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={COLUMNS} rows={ROWS} />)

    const searchInput = screen.getByPlaceholderText('Search…')
    await user.type(searchInput, 'hund')

    // Only Hund row should be visible
    expect(screen.getByText('Hund')).toBeTruthy()
    expect(screen.queryByText('Katze')).toBeNull()
    expect(screen.queryByText('Haus')).toBeNull()
  })

  it('level pill click filters by level', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={COLUMNS} rows={ROWS} levelKey="Level" />)

    // B1 pill should exist
    const b1Pill = screen.getByRole('button', { name: 'B1' })
    await user.click(b1Pill)

    // Only B1 entry should show
    expect(screen.queryByText('Hund')).toBeNull()
    expect(screen.getByText('Katze')).toBeTruthy()
    expect(screen.queryByText('Haus')).toBeNull()
  })

  it('column header click sorts ascending', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={COLUMNS} rows={ROWS} />)

    const wordHeader = screen.getByText('Word')
    await user.click(wordHeader)

    // After one click: ascending alphabetical order
    const cells = screen.getAllByRole('cell')
    const words = cells.filter(c => ['Hund', 'Katze', 'Haus'].includes(c.textContent))
    // Sorted ascending: Haus, Hund, Katze
    expect(words[0].textContent).toBe('Haus')
    expect(words[1].textContent).toBe('Hund')
    expect(words[2].textContent).toBe('Katze')
  })

  it('second click on same header sorts descending', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={COLUMNS} rows={ROWS} />)

    const wordHeader = screen.getByText('Word')
    await user.click(wordHeader) // ascending
    await user.click(wordHeader) // descending

    const cells = screen.getAllByRole('cell')
    const words = cells.filter(c => ['Hund', 'Katze', 'Haus'].includes(c.textContent))
    // Sorted descending: Katze, Hund, Haus
    expect(words[0].textContent).toBe('Katze')
    expect(words[1].textContent).toBe('Hund')
    expect(words[2].textContent).toBe('Haus')
  })

  it('clicking an editable cell shows input with current value', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={COLUMNS} rows={ROWS} onUpdate={vi.fn()} />)

    // Click the 'Hund' cell (editable Word column)
    const hundCell = screen.getByText('Hund').closest('td')
    await user.click(hundCell)

    // Input should appear with value 'Hund'
    const input = screen.getByDisplayValue('Hund')
    expect(input).toBeTruthy()
    expect(input.tagName.toLowerCase()).toBe('input')
  })

  it('typing in edit input and pressing Enter calls onUpdate with correct args', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<DataTable columns={COLUMNS} rows={ROWS} onUpdate={onUpdate} />)

    // Click on Meaning cell for first row (row index 0 in original data = _oi: 0)
    const meaningCell = screen.getByText('dog').closest('td')
    await user.click(meaningCell)

    const input = screen.getByDisplayValue('dog')
    await user.clear(input)
    await user.type(input, 'canine')
    await user.keyboard('{Enter}')

    expect(onUpdate).toHaveBeenCalledWith(0, { Meaning: 'canine' })
  })

  it('pressing Escape cancels edit without calling onUpdate', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<DataTable columns={COLUMNS} rows={ROWS} onUpdate={onUpdate} />)

    const meaningCell = screen.getByText('dog').closest('td')
    await user.click(meaningCell)

    const input = screen.getByDisplayValue('dog')
    await user.clear(input)
    await user.type(input, 'changed')
    await user.keyboard('{Escape}')

    expect(onUpdate).not.toHaveBeenCalled()
    // Input should be gone
    expect(screen.queryByDisplayValue('changed')).toBeNull()
  })

  it('delete button shows confirmation dialog when clicked', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={COLUMNS} rows={ROWS} onDelete={vi.fn()} />)

    // Find delete button (has title="Delete") — visible on hover, but in tests we can click it
    const deleteButtons = screen.getAllByTitle('Delete')
    await user.click(deleteButtons[0])

    // Should show confirmation UI
    expect(screen.getByText('Delete?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
  })

  it('confirming delete calls onDelete with row index', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<DataTable columns={COLUMNS} rows={ROWS} onDelete={onDelete} />)

    const deleteButtons = screen.getAllByTitle('Delete')
    await user.click(deleteButtons[0]) // triggers confirmation
    await user.click(screen.getByRole('button', { name: 'Yes' }))

    expect(onDelete).toHaveBeenCalledWith(0) // first row, _oi = 0
  })

  it('shows "No entries match your search" when search has no results', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={COLUMNS} rows={ROWS} />)

    const searchInput = screen.getByPlaceholderText('Search…')
    await user.type(searchInput, 'xyzabc')

    expect(screen.getByText(/No entries match your search/i)).toBeTruthy()
  })
})
