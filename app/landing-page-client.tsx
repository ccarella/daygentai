'use client';

import { EmailLogin } from '@/components/auth/email-login';
import styles from './page.module.css';

export default function LandingPageClient() {
  return (
    <div style={{ backgroundColor: '#FDF9F4', minHeight: '100vh' }}>
      <div className={styles['container']}>
        <div className={styles['wordmark']}>DAYGENT</div>
        
        <header className={styles['header']}>
          <h1>Your AI Development Team, Managed</h1>
          <p className={styles['subtitle']}>
            The productivity platform for orchestrating software agents
          </p>
        </header>
        
        <p className={styles['lead']}>
          Transform ideas into issues. Let AI agents handle the code. Ship faster with intelligent task management designed for the agentic era.
        </p>
        
        <div className={styles['emailSection']}>
          <div className={styles['emailContent']}>
            <svg 
              className={styles['loginIcon']} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <h2 className={styles['loginTitle']}>Welcome back</h2>
            <p className={styles['loginSubtitle']}>Sign in to your account to continue</p>
            <EmailLogin />
          </div>
        </div>
        
        <section className={styles['section']}>
          <h2>Built for Modern Development</h2>
          <div className={styles['features']}>
            <div className={styles['feature']}>
              <h3>AI-Optimized Issue Tracking</h3>
              <p>Create issues that agents understand. Our platform generates precise, executable prompts from your requirements.</p>
            </div>
            <div className={styles['feature']}>
              <h3>Intelligent Task Orchestration</h3>
              <p>Kanban boards that know when to deploy agents. Automate handoffs between human review and AI execution.</p>
            </div>
            <div className={styles['feature']}>
              <h3>Multi-Agent Workspace</h3>
              <p>Connect Claude, GPT-4, or any AI coding assistant. Manage your entire AI development team from one interface.</p>
            </div>
            <div className={styles['feature']}>
              <h3>Democratizing Development</h3>
              <p>Non-technical founders describe what they want. Daygent transforms ideas into specifications that AI implements flawlessly.</p>
            </div>
          </div>
        </section>
        
        <div className={styles['valueSection']}>
          <h3>Stop managing tasks. Start shipping features.</h3>
          <p>Join teams using Daygent to 10x their development velocity</p>
        </div>
      </div>
    </div>
  );
}