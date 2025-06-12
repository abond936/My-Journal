'use client';

// Home.tsx - Main landing page component

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import styles from '@/components/view/Home.module.css';

const Home: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    if (result?.error) {
      setError('Invalid credentials. Please try again.');
    } else if (result?.ok) {
      router.push('/view');
    }
  };
  
  const handleEnter = () => {
    router.push('/view');
  };

  const renderLoginForm = () => (
    <form onSubmit={handleSignIn} className={styles.loginForm}>
      {error && <p className={styles.errorMessage}>{error}</p>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className={styles.inputField}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={styles.inputField}
        required
      />
      <button type="submit" className={styles.enterButton}>
        Sign In
      </button>
    </form>
  );

  const renderWelcomeMessage = () => (
    <>
      <p className={styles.welcomeText}>
        Welcome back, {session?.user?.name}.<br />
        Ready to continue your story?
      </p>
      <button onClick={handleEnter} className={styles.enterButton}>
        Enter
      </button>
    </>
  );
  
  const renderLoading = () => (
    <p className={styles.welcomeText}>Loading...</p>
  );

  return (
    <div className={styles.pageWrapper}>
      {/* Top corner graphic */}
      <div className={styles.topCorner}>
        <img src="/images/uploads/top-corner.png" alt="" />
      </div>

      {/* Main content area */}
      <div className={styles.contentWrapper}>
        {/* Title section */}
        <div className={styles.titleSection}>
          <img 
            src="/images/uploads/Title.jpg" 
            alt="My Stories - Michael Alan Bond" 
            className={styles.titleImage}
          />
        </div>

        {/* Welcome/Login Section */}
        <section className={styles.welcomeSection}>
          {status === 'loading' && renderLoading()}
          {status === 'authenticated' && renderWelcomeMessage()}
          {status === 'unauthenticated' && (
            <>
              <p className={styles.welcomeText}>
                Welcome to my digital memoir.<br />
                Stories about the people, places, and events of my life.
              </p>
              {renderLoginForm()}
            </>
          )}
        </section>
      </div>

      {/* Bottom corner graphic */}
      <div className={styles.bottomCorner}>
        <img src="/images/uploads/bottom-corner.png" alt="" />
      </div>
    </div>
  );
};

export default Home;