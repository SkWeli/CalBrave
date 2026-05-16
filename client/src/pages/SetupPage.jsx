import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import userService from '../services/userService';
import weightService from '../services/weightService';
import styles from './SetupPage.module.css';

function calculateBMI(heightCm, currentWeight) {
  const heightM = heightCm / 100;
  const bmi = currentWeight / (heightM * heightM);

  const minHealthy = 18.5 * heightM * heightM;
  const maxHealthy = 24.9 * heightM * heightM;

  let bmiStatus;
  let targetWeight;

  if (bmi < 18.5) {
    bmiStatus = 'underweight';
    targetWeight = Math.round(minHealthy * 10) / 10;
  } else if (bmi > 24.9) {
    bmiStatus = 'overweight';
    targetWeight = Math.round(maxHealthy * 10) / 10;
  } else {
    bmiStatus = 'healthy';
    targetWeight = Math.round(currentWeight * 10) / 10;
  }

  return { bmi: Math.round(bmi * 10) / 10, bmiStatus, targetWeight };
}

function SetupPage() {
  const navigate = useNavigate();

  const [name, setName]               = useState('');
  const [height, setHeight]           = useState('');
  const [weight, setWeight]           = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender]           = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [checking, setChecking]       = useState(true);

  // If this user already completed setup in a previous session, skip straight
  // to the dashboard rather than showing the form again.
  useEffect(() => {
    let cancelled = false;

    async function checkExistingProfile() {
      try {
        await userService.getProfile();
        // Profile exists — no need to show setup
        if (!cancelled) navigate('/dashboard', { replace: true });
      } catch (err) {
        // 404 → no profile yet, show the form
        if (!cancelled) setChecking(false);
      }
    }

    checkExistingProfile();

    return () => { cancelled = true; };
  }, [navigate]);

  function getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!gender) {
      setError('Please select a gender.');
      return;
    }

    setSaving(true);

    try {
      const { bmi, bmiStatus, targetWeight } = calculateBMI(
        parseFloat(height),
        parseFloat(weight)
      );

      await Promise.all([
        userService.saveProfile({
          name,
          height:     parseFloat(height),
          gender,
          goalWeight: targetWeight,
          bmi,
          bmiStatus,
          dateOfBirth,
        }),
        weightService.logWeight(parseFloat(weight), getTodayDate()),
      ]);

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Show nothing (or a spinner) while we confirm no existing profile exists
  if (checking) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.brand}>CalBrave</p>
          <h1 className={styles.title}>Set up your profile</h1>
          <p className={styles.subtitle}>
            We need a few details to personalise your experience.
          </p>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Senuda"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Height</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  placeholder="173"
                  min="100"
                  max="250"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className={styles.input}
                  required
                />
                <span className={styles.unit}>cm</span>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Weight</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="80"
                  min="30"
                  max="300"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className={styles.input}
                  required
                />
                <span className={styles.unit}>kg</span>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Gender</label>
            <div className={styles.genderRow}>
              {['male', 'female'].map(g => (
                <button
                  key={g}
                  type="button"
                  className={`${styles.genderBtn} ${gender === g ? styles.genderActive : ''}`}
                  onClick={() => setGender(g)}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <button type="submit" disabled={saving} className={styles.submitBtn}>
            {saving ? 'Saving…' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetupPage;