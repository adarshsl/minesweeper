"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Flag, RefreshCw, Timer } from "lucide-react"

import { Button } from "@/components/ui/button"

interface CellType {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  adjacentMines: number
}

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy")
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing")
  const [firstClick, setFirstClick] = useState(true)
  const [time, setTime] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)

  // Game configuration based on difficulty
  const config = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 12, cols: 12, mines: 30 },
    hard: { rows: 16, cols: 16, mines: 60 },
  }

  const { rows, cols, mines } = config[difficulty]

  // Initialize board
  const [board, setBoard] = useState<CellType[][]>([])

  const [minesLeft, setMinesLeft] = useState(mines)

  // Initialize or reset the game
  const initializeGame = () => {
    const newBoard = Array(rows)
      .fill(null)
      .map(() =>
        Array(cols)
          .fill(null)
          .map(() => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            adjacentMines: 0,
          })),
      )

    setBoard(newBoard)
    setGameState("playing")
    setFirstClick(true)
    setMinesLeft(mines)

    // Reset timer
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
    setTime(0)
  }

  // Place mines after first click
  const placeMines = (clickedRow: number, clickedCol: number) => {
    const newBoard = [...board]

    // Create a list of all possible positions excluding the clicked cell and its neighbors
    const positions = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Skip the clicked cell and its neighbors
        if (Math.abs(r - clickedRow) <= 1 && Math.abs(c - clickedCol) <= 1) {
          continue
        }
        positions.push({ r, c })
      }
    }

    // Shuffle the positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }

    // Place mines
    const mineCount = Math.min(mines, positions.length)
    for (let i = 0; i < mineCount; i++) {
      const { r, c } = positions[i]
      newBoard[r][c].isMine = true
    }

    // If we couldn't place all mines due to board size constraints
    if (mineCount < mines) {
      setMinesLeft(mineCount)
    }

    // Calculate adjacent mines
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!newBoard[r][c].isMine) {
          let count = 0
          // Check all 8 adjacent cells
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue

              const newR = r + dr
              const newC = c + dc

              if (newR >= 0 && newR < rows && newC >= 0 && newC < cols && newBoard[newR][newC].isMine) {
                count++
              }
            }
          }
          newBoard[r][c].adjacentMines = count
        }
      }
    }

    setBoard(newBoard)
  }

  // Start timer on first click
  const startTimer = () => {
    if (timerInterval) return

    const interval = setInterval(() => {
      setTime((prevTime) => prevTime + 1)
    }, 1000)

    setTimerInterval(interval)
  }

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (gameState !== "playing" || board[row][col].isFlagged) return

    // Start timer on first click
    if (firstClick) {
      startTimer()
      placeMines(row, col)
      setFirstClick(false)
    }

    const newBoard = [...board]

    // Game over if mine is clicked
    if (newBoard[row][col].isMine) {
      // Reveal all mines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (newBoard[r][c].isMine) {
            newBoard[r][c].isRevealed = true
          }
        }
      }

      setBoard(newBoard)
      setGameState("lost")

      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }

      return
    }

    // Reveal the cell
    revealCell(newBoard, row, col)

    // Check if player has won
    checkWinCondition(newBoard)

    setBoard(newBoard)
  }
  // Recursively reveal cells with a queue-based approach to prevent stack overflow
  const revealCell = (board: CellType[][], row: number, col: number) => {
    const queue = [{ row, col }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const { row: r, col: c } = queue.shift()!
      const key = `${r},${c}`

      if (
        r < 0 || r >= rows || // Out of bounds check
        c < 0 || c >= cols || // Out of bounds check
        visited.has(key) || // Already visited
        board[r][c].isFlagged || // Skip flagged cells
        board[r][c].isMine || // Skip mines
        board[r][c].isRevealed // Skip already revealed cells
      ) {
        continue
      }

      visited.add(key)
      board[r][c].isRevealed = true

      // If cell has no adjacent mines, add all adjacent cells to queue
      if (board[r][c].adjacentMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue // Skip the current cell
            const newRow = r + dr
            const newCol = c + dc
            queue.push({ row: newRow, col: newCol })
          }
        }
      }
    }
  }

  // Handle right click (flag)
  const handleRightClick = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()

    if (gameState !== "playing" || board[row][col].isRevealed) return

    const newBoard = [...board]

    // Toggle flag
    newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged

    // Update mines left counter
    setMinesLeft((prevMinesLeft) => (newBoard[row][col].isFlagged ? prevMinesLeft - 1 : prevMinesLeft + 1))

    setBoard(newBoard)
  }

  // Handle long press for mobile (flag)
  const handleLongPress = (row: number, col: number) => {
    if (gameState !== "playing" || board[row][col].isRevealed) return

    const newBoard = [...board]

    // Toggle flag
    newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged

    // Update mines left counter
    setMinesLeft((prevMinesLeft) => (newBoard[row][col].isFlagged ? prevMinesLeft - 1 : prevMinesLeft + 1))

    setBoard(newBoard)
  }

  // Check if player has won
  const checkWinCondition = (board: CellType[][]) => {
    let unrevealed = 0
    let correctFlags = 0

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Count unrevealed non-mine cells
        if (!board[r][c].isRevealed && !board[r][c].isMine) {
          unrevealed++
        }

        // Count correctly flagged mines
        if (board[r][c].isFlagged && board[r][c].isMine) {
          correctFlags++
        }
      }
    }

    // Win if all non-mine cells are revealed OR all mines are correctly flagged
    if (unrevealed === 0 || correctFlags === mines) {
      setGameState("won")

      // Reveal all unflagged mines with checkmarks
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c].isMine && !board[r][c].isFlagged) {
            board[r][c].isRevealed = true
          }
        }
      }

      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
    }
  }

  // Initialize game on mount and when difficulty changes
  useEffect(() => {
    initializeGame()

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [difficulty])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Cell component
  const Cell = ({ cell, row, col }: { cell: CellType; row: number; col: number }) => {
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

    const handleTouchStart = () => {
      const timer = setTimeout(() => {
        handleLongPress(row, col)
      }, 500) // 500ms long press

      setLongPressTimer(timer)
    }

    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
      }
    }

    // Determine cell content and style
    let content = null
    let cellClass = "w-full h-full flex items-center justify-center select-none rounded-sm transition-colors"

    if (cell.isRevealed) {
      if (cell.isMine) {
        content = gameState === "won" ? "✅" : "💣"
        cellClass += gameState === "won" ? " bg-green-400" : " bg-red-400"
      } else {
        if (cell.adjacentMines > 0) {
          content = cell.adjacentMines

          // Different colors for different numbers
          const colors = [
            "", // No 0s are displayed
            "text-blue-600", // 1
            "text-green-600", // 2
            "text-red-600", // 3
            "text-purple-600", // 4
            "text-yellow-600", // 5
            "text-teal-600", // 6
            "text-pink-600", // 7
            "text-gray-800", // 8
          ]

          cellClass += ` ${colors[cell.adjacentMines]} font-bold`
        }

        cellClass += " bg-slate-100"
      }
    } else {
      cellClass += " bg-teal-400 hover:bg-teal-500 cursor-pointer active:bg-teal-600"

      if (cell.isFlagged) {
        content = "🚩"
      }
    }

    return (
      <button
        className={cellClass}
        onClick={() => handleCellClick(row, col)}
        onContextMenu={(e) => handleRightClick(e, row, col)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-sky-50 to-sky-100">
      <h1 className="text-2xl font-bold mb-4 text-teal-700">Minesweeper</h1>

      {/* Game status */}
      <div className="mb-4 text-center">
        {gameState === "won" && <div className="text-xl font-bold text-green-600">You Win! 🎉</div>}
        {gameState === "lost" && <div className="text-xl font-bold text-red-600">Game Over! 💥</div>}
      </div>

      {/* Game controls */}
      <div className="flex justify-between items-center w-full max-w-sm mb-4">
        <div className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1 rounded-md shadow-sm">
          <Flag size={16} />
          <span>{minesLeft}</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={initializeGame}
            className="flex items-center gap-1 bg-white shadow-sm"
          >
            <RefreshCw size={16} />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1 rounded-md shadow-sm">
          <Timer size={16} />
          <span>{formatTime(time)}</span>
        </div>
      </div>

      {/* Difficulty selector */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={difficulty === "easy" ? "default" : "outline"}
          size="sm"
          onClick={() => setDifficulty("easy")}
          className={difficulty === "easy" ? "bg-teal-600 hover:bg-teal-700" : "bg-white shadow-sm"}
        >
          Easy
        </Button>
        <Button
          variant={difficulty === "medium" ? "default" : "outline"}
          size="sm"
          onClick={() => setDifficulty("medium")}
          className={difficulty === "medium" ? "bg-teal-600 hover:bg-teal-700" : "bg-white shadow-sm"}
        >
          Medium
        </Button>
        <Button
          variant={difficulty === "hard" ? "default" : "outline"}
          size="sm"
          onClick={() => setDifficulty("hard")}
          className={difficulty === "hard" ? "bg-teal-600 hover:bg-teal-700" : "bg-white shadow-sm"}
        >
          Hard
        </Button>
      </div>

      {/* Game board */}
      <div 
        className={`relative w-full max-w-sm aspect-square bg-teal-200 border-2 border-teal-700 rounded-md shadow-md p-0.5 grid gap-0.5`}
        style={{ 
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Cell key={`${rowIndex}-${colIndex}`} cell={cell} row={rowIndex} col={colIndex} />
          )),
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-teal-700 max-w-sm bg-white p-3 rounded-md shadow-sm">
        <p className="mb-2">
          <strong>How to play:</strong>
        </p>
        <ul className="list-disc pl-5">
          <li>Tap to reveal a cell</li>
          <li>Long press or right-click to place a flag</li>
          <li>Numbers show how many mines are adjacent</li>
          <li>Avoid all mines to win!</li>
        </ul>
      </div>
    </div>
  )
}

