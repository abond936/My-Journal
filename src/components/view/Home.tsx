'use client';

// Home.tsx - Main landing page component

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import styles from '@/components/view/Home.module.css';

const Home: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();
  const { theme } = useTheme();
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
  
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/view');
    }
  }, [status, router]);

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

  const renderLoading = () => (
    <p className={styles.welcomeText}>Loading...</p>
  );

  return (
    <div className={styles.pageWrapper}>
      {/* Top corner graphic */}
      <div className={styles.topCorner}>
        <Image 
          src="/images/uploads/top-corner.png" 
          alt="" 
          width={200}
          height={200}
          sizes="200px"
        />
      </div>

      {/* Main content area */}
      <div className={styles.contentWrapper}>
        {/* Title section */}
        <div className={styles.titleSection}>
          <Image 
            src={`/images/uploads/Title-${theme === 'dark' ? 'dark' : 'light'}.png`}
            alt="My Stories - Michael Alan Bond" 
            className={styles.titleImage}
            width={600}
            height={300}
            sizes="(max-width: 768px) 100vw, 600px"
            priority={true}
          />
        </div>

        {/* Welcome/Login Section */}
        <section className={styles.welcomeSection}>
          {status === 'loading' && renderLoading()}
          {status === 'authenticated' && renderLoading()}
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
        <Image 
          src="/images/uploads/bottom-corner.png" 
          alt="" 
          width={200}
          height={200}
          sizes="200px"
        />
      </div>
    </div>
  );
};

export default Home;