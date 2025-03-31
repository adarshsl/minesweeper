"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Flag, RefreshCw, Timer } from "lucide-react"
import { useRouter } from "next/navigation"
import Cookies from 'js-cookie'

import { Button } from "@/components/ui/button"

interface Cell {
  hasMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  neighborMines: number
}

export default function Minesweeper() {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy")
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing")
  const [firstClick, setFirstClick] = useState(true)
  const [time, setTime] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [board, setBoard] = useState<Cell[][]>([])
  const [userName, setUserName] = useState("")
  const [showWelcome, setShowWelcome] = useState(true)

  // Load user data on mount
  useEffect(() => {
    const userCookie = Cookies.get('user')
    if (userCookie) {
      try {
        const userData = JSON.parse(userCookie)
        setUserName(userData.name)
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }

    // Hide welcome message after 3 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  // Game configuration based on difficulty
  const config = {
    easy: { rows: 8, cols: 8, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
  }

  // Calculate remaining mines
  const minesLeft = config[difficulty].mines - board.flat().filter(cell => cell.isFlagged).length

  const handleLogout = () => {
    Cookies.remove('user')
    router.push('/login')
  }

  // Initialize board
  useEffect(() => {
    initializeBoard()
  }, [difficulty])

  // Timer effect
  useEffect(() => {
    if (gameState === "playing" && !firstClick) {
      const interval = setInterval(() => {
        setTime(prev => prev + 1)
      }, 1000)
      setTimerInterval(interval)
      return () => clearInterval(interval)
    }
    return () => {}
  }, [gameState, firstClick])

  const initializeBoard = () => {
    const { rows, cols } = config[difficulty]
    const newBoard: Cell[][] = Array(rows).fill(null).map(() =>
      Array(cols).fill(null).map(() => ({
        hasMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
      }))
    )
    setBoard(newBoard)
    setGameState("playing")
    setFirstClick(true)
    setTime(0)
    if (timerInterval) clearInterval(timerInterval)
  }

  const placeMines = (firstRow: number, firstCol: number) => {
    const { rows, cols, mines } = config[difficulty]
    const newBoard = [...board]
    let minesPlaced = 0

    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * rows)
      const col = Math.floor(Math.random() * cols)

      // Don't place mine on first click or where a mine already exists
      if ((row !== firstRow || col !== firstCol) && !newBoard[row][col].hasMine) {
        newBoard[row][col].hasMine = true
        minesPlaced++
      }
    }

    // Calculate neighbor mines
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!newBoard[row][col].hasMine) {
          let count = 0
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              const newRow = row + i
              const newCol = col + j
              if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
                if (newBoard[newRow][newCol].hasMine) count++
              }
            }
          }
          newBoard[row][col].neighborMines = count
        }
      }
    }

    setBoard(newBoard)
  }

  const revealCell = (row: number, col: number) => {
    if (gameState !== "playing" || board[row][col].isFlagged || board[row][col].isRevealed) return

    const newBoard = [...board]

    if (firstClick) {
      setFirstClick(false)
      placeMines(row, col)
    }

    if (newBoard[row][col].hasMine) {
      // Game Over
      revealAllMines()
      setGameState("lost")
      if (timerInterval) clearInterval(timerInterval)
      return
    }

    // Reveal current cell
    newBoard[row][col].isRevealed = true
    setBoard(newBoard)

    // If cell has no adjacent mines, reveal neighbors
    if (newBoard[row][col].neighborMines === 0) {
      const { rows, cols } = config[difficulty]
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const newRow = row + i
          const newCol = col + j
          if (
            newRow >= 0 && newRow < rows &&
            newCol >= 0 && newCol < cols &&
            !newBoard[newRow][newCol].isRevealed &&
            !newBoard[newRow][newCol].isFlagged
          ) {
            revealCell(newRow, newCol)
          }
        }
      }
    }

    // Check for win
    checkWin()
  }

  const toggleFlag = (row: number, col: number) => {
    if (gameState !== "playing" || board[row][col].isRevealed) return

    const newBoard = [...board]
    newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged
    setBoard(newBoard)
  }

  const revealAllMines = () => {
    const newBoard = board.map(row =>
      row.map(cell => ({
        ...cell,
        isRevealed: cell.hasMine ? true : cell.isRevealed
      }))
    )
    setBoard(newBoard)
  }

  const checkWin = () => {
    const allNonMinesRevealed = board.every(row =>
      row.every(cell => cell.hasMine || cell.isRevealed)
    )
    if (allNonMinesRevealed) {
      setGameState("won")
      if (timerInterval) clearInterval(timerInterval)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start p-4 ${isDarkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {showWelcome && userName && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-out z-50">
          Hello, {userName}! 👋
        </div>
      )}
      
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <div className={`text-lg font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Mines: {minesLeft}
            </div>
            <div className={`text-lg font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Time: {formatTime(time)}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Logout
            </Button>
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </Button>
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl p-6`}>
          <h1 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-slate-200' : 'text-indigo-700'}`}>
            Minesweeper
          </h1>

          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => setDifficulty("easy")}
              variant={difficulty === "easy" ? "default" : "outline"}
              className={difficulty === "easy" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
            >
              Easy
            </Button>
            <Button
              onClick={() => setDifficulty("medium")}
              variant={difficulty === "medium" ? "default" : "outline"}
              className={difficulty === "medium" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
            >
              Medium
            </Button>
            <Button
              onClick={() => setDifficulty("hard")}
              variant={difficulty === "hard" ? "default" : "outline"}
              className={difficulty === "hard" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
            >
              Hard
            </Button>
            <Button onClick={initializeBoard} className="ml-auto bg-indigo-600 hover:bg-indigo-700">
              Reset
            </Button>
          </div>

          <div className="flex justify-center mb-4">
            <div className={`inline-block border ${isDarkMode ? 'border-slate-600' : 'border-slate-300'}`}
                 style={{
                   display: 'grid',
                   gridTemplateColumns: `repeat(${config[difficulty].cols}, ${difficulty === 'hard' ? 'minmax(0, 1fr)' : '32px'})`,
                   width: difficulty === 'hard' ? '100%' : 'auto',
                   maxWidth: '100%'
                 }}>
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => revealCell(rowIndex, colIndex)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      toggleFlag(rowIndex, colIndex)
                    }}
                    className={`
                      ${difficulty === 'hard' ? 'aspect-square' : 'w-8 h-8'} 
                      flex items-center justify-center text-sm
                      border-r border-b ${isDarkMode ? 'border-slate-600' : 'border-slate-300'}
                      ${cell.isRevealed
                        ? cell.hasMine
                          ? 'bg-rose-500 text-white'
                          : isDarkMode 
                            ? 'bg-slate-700 hover:bg-slate-600' 
                            : 'bg-indigo-50 hover:bg-indigo-100'
                        : isDarkMode 
                            ? 'bg-slate-800 hover:bg-slate-700' 
                            : 'bg-emerald-100 hover:bg-emerald-200 shadow-inner'}
                      ${gameState === "lost" && cell.hasMine ? 'bg-rose-500 text-white' : ''}
                      ${cell.neighborMines === 1 ? 'text-blue-600 dark:text-blue-400' : ''}
                      ${cell.neighborMines === 2 ? 'text-emerald-600 dark:text-emerald-400' : ''}
                      ${cell.neighborMines === 3 ? 'text-rose-600 dark:text-rose-400' : ''}
                      ${cell.neighborMines === 4 ? 'text-indigo-600 dark:text-indigo-400' : ''}
                      ${cell.neighborMines === 5 ? 'text-amber-600 dark:text-amber-400' : ''}
                      ${cell.neighborMines === 6 ? 'text-teal-600 dark:text-teal-400' : ''}
                      ${cell.neighborMines === 7 ? 'text-purple-600 dark:text-purple-400' : ''}
                      ${cell.neighborMines === 8 ? 'text-gray-600 dark:text-gray-400' : ''}
                      transition-all duration-200 ease-in-out
                      ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}
                      font-semibold
                    `}
                    disabled={gameState !== "playing"}
                  >
                    {cell.isRevealed
                      ? cell.hasMine
                        ? '💣'
                        : cell.neighborMines > 0
                          ? cell.neighborMines
                          : ''
                      : cell.isFlagged
                        ? '🚩'
                        : ''}
                  </button>
                ))
              )}
            </div>
          </div>

          {gameState !== "playing" && (
            <div className={`text-center text-lg font-bold ${gameState === "won" ? 'text-emerald-600' : 'text-rose-600'}`}>
              {gameState === "won" ? "Congratulations! You won!" : "Game Over!"}
            </div>
          )}

          <div className="mt-4">
            <h2 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              How to play:
            </h2>
            <ul className={`list-disc list-inside ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <li>Click to reveal a cell</li>
              <li>Right-click or long press to place a flag</li>
              <li>Numbers show how many mines are adjacent</li>
              <li>Avoid all mines to win!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

