'use client';

import { EmailLogin } from '@/components/auth/email-login';
import styles from './page.module.css';

export default function LandingPageClient() {
  return (
    <div style={{ backgroundColor: '#FDF9F4', minHeight: '100vh' }}>
      <div className={styles['container']}>
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
            <div className={styles['terminalHeader']}>
              <div className={styles['terminalButtons']}>
                <span className={styles['terminalButton']} data-color="red"></span>
                <span className={styles['terminalButton']} data-color="yellow"></span>
                <span className={styles['terminalButton']} data-color="green"></span>
              </div>
              <div className={styles['terminalTitle']}>DAYGENT TERMINAL v2.0</div>
            </div>
            <div className={styles['terminalBody']}>
              <div className={styles['terminalLogo']}>DAYGENT</div>
              <div className={styles['terminalSubtext']}>SYSTEM ACCESS PORTAL</div>
              <EmailLogin />
            </div>
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