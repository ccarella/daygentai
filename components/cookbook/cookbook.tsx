'use client'

import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CookbookIssue {
  id: string
  title: string
  description: string
  section: string
}

const placeholderIssues: CookbookIssue[] = [
  // Setup Section
  {
    id: 'setup-1',
    title: 'Initial Environment Configuration',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    section: 'Setup'
  },
  {
    id: 'setup-2',
    title: 'Database Connection Setup',
    description: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt.',
    section: 'Setup'
  },
  {
    id: 'setup-3',
    title: 'Authentication Provider Integration',
    description: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto.',
    section: 'Setup'
  },
  // Testing and Debugging Section
  {
    id: 'testing-1',
    title: 'Unit Test Framework Setup',
    description: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati.',
    section: 'Testing and Debugging'
  },
  {
    id: 'testing-2',
    title: 'Debugging Production Issues',
    description: 'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.',
    section: 'Testing and Debugging'
  },
  {
    id: 'testing-3',
    title: 'Performance Monitoring Setup',
    description: 'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae itaque earum rerum.',
    section: 'Testing and Debugging'
  },
  // Documents Section
  {
    id: 'docs-1',
    title: 'API Documentation Standards',
    description: 'Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere.',
    section: 'Documents'
  },
  {
    id: 'docs-2',
    title: 'Component Library Documentation',
    description: 'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur at vero eos.',
    section: 'Documents'
  },
  {
    id: 'docs-3',
    title: 'Deployment Guide Template',
    description: 'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam.',
    section: 'Documents'
  }
]

export function Cookbook() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<CookbookIssue | null>(null)
  const router = useRouter()

  const sections = ['Setup', 'Testing and Debugging', 'Documents']

  const handleSectionClick = (section: string) => {
    setSelectedSection(section)
    setSelectedIssue(null)
  }

  const handleIssueClick = (issue: CookbookIssue) => {
    setSelectedIssue(issue)
  }

  // Handle ESC key to navigate back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (selectedIssue) {
          setSelectedIssue(null)
        } else if (selectedSection) {
          setSelectedSection(null)
        } else {
          router.back()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIssue, selectedSection, router])

  const filteredIssues = selectedSection 
    ? placeholderIssues.filter(issue => issue.section === selectedSection)
    : []

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-6">
        {!selectedIssue ? (
          <div>
            <h1 className="text-2xl font-bold mb-6">Cookbook</h1>
            {selectedSection ? (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="hover:text-foreground"
                  >
                    Cookbook
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <span>{selectedSection}</span>
                </div>
                <div className="space-y-4">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => handleIssueClick(issue)}
                      className="border border-border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                    >
                      <h3 className="font-semibold text-lg mb-2">{issue.title}</h3>
                      <p className="text-muted-foreground line-clamp-2">{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Select a section from the directory to view cookbook recipes.</p>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <button
                onClick={() => setSelectedSection(null)}
                className="hover:text-foreground"
              >
                Cookbook
              </button>
              <ChevronRight className="w-4 h-4" />
              <button
                onClick={() => setSelectedIssue(null)}
                className="hover:text-foreground"
              >
                {selectedIssue.section}
              </button>
              <ChevronRight className="w-4 h-4" />
              <span>{selectedIssue.title}</span>
            </div>
            <article className="prose max-w-none">
              <h1>{selectedIssue.title}</h1>
              <p>{selectedIssue.description}</p>
            </article>
          </div>
        )}
      </div>

      {/* Right Sidebar - Cookbook Directory */}
      <div className="w-64 border-l border-border p-4 bg-sidebar">
        <h2 className="font-semibold text-lg mb-4">Directory</h2>
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                selectedSection === section
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'hover:bg-sidebar-accent text-sidebar-foreground'
              }`}
            >
              {section}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}