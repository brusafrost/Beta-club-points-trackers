import React, { useState } from 'react';
import { AuthSession } from '../types';
import { BetaStorage } from '../services/storage';
import { User, ShieldCheck, LogIn, UserPlus, ArrowRight, Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [roleMode, setRoleMode] = useState<'student' | 'officer'>('student');
  const [studentMode, setStudentMode] = useState<'signin' | 'register'>('signin');

  // Student form fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<number>(11);

  // Officer form fields
  const [officerCode, setOfficerCode] = useState<string>('');

  // UI state
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (studentMode === 'register') {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setErrorMsg('Please fill in all required fields.');
        setIsLoading(false);
        return;
      }
      if (password && password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        setIsLoading(false);
        return;
      }

      const res = await BetaStorage.registerMember(
        firstName,
        lastName,
        email,
        password || undefined,
        gradeLevel
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      const session = BetaStorage.getSession();
      if (session) onLoginSuccess(session);
    } else {
      // Sign in mode
      if (!email.trim()) {
        setErrorMsg('Please enter your school email.');
        setIsLoading(false);
        return;
      }

      const res = await BetaStorage.loginStudent(email, password || undefined);
      if (!res.success) {
        setErrorMsg(res.error || 'Login failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      const session = BetaStorage.getSession();
      if (session) onLoginSuccess(session);
    }

    setIsLoading(false);
  };

  const handleOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!officerCode.trim()) {
      setErrorMsg('Please enter the officer passcode.');
      setIsLoading(false);
      return;
    }

    const res = BetaStorage.loginOfficer(officerCode);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid officer passcode.');
      setIsLoading(false);
      return;
    }

    const session = BetaStorage.getSession();
    if (session) onLoginSuccess(session);
    setIsLoading(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
        
        {/* Brand Top - Clean Typography Wordmark */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Beta Club Portal
          </h1>
          <p className="text-xs text-zinc-500 font-mono">
            National Beta Club &bull; Chapter Service & Points Log
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setRoleMode('student');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === 'student'
                ? 'bg-white text-zinc-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Student Portal</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleMode('officer');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === 'officer'
                ? 'bg-white text-zinc-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Officer Portal</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Student Form */}
        {roleMode === 'student' && (
          <div className="space-y-4">
            <div className="flex bg-zinc-50 p-1 rounded-xl border border-zinc-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setStudentMode('signin');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  studentMode === 'signin'
                    ? 'bg-white text-zinc-900 shadow-xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Member Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudentMode('register');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  studentMode === 'register'
                    ? 'bg-white text-zinc-900 shadow-xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Join / Register New</span>
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-3.5 text-xs">
              {studentMode === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-700">First Name</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Alex"
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-700">Last Name</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Morgan"
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700">Grade Level</label>
                    <select
                      value={gradeLevel}
                      onChange={e => setGradeLevel(Number(e.target.value))}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:border-zinc-500 text-xs font-mono font-medium"
                    >
                      <option value={9}>9th Grade (Freshman)</option>
                      <option value={10}>10th Grade (Sophomore)</option>
                      <option value={11}>11th Grade (Junior)</option>
                      <option value={12}>12th Grade (Senior)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">School Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@school.edu"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 flex justify-between">
                  <span>{studentMode === 'register' ? 'Create Password (Min 6 chars)' : 'Password'}</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={studentMode === 'register'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 pr-9 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {studentMode === 'register' && (
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500 text-xs"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>{isLoading ? 'Processing...' : studentMode === 'signin' ? 'Sign In to Dashboard' : 'Complete Registration & Join'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Officer Form */}
        {roleMode === 'officer' && (
          <form onSubmit={handleOfficerSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-800">Officer Master Passcode</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={officerCode}
                  onChange={e => setOfficerCode(e.target.value)}
                  placeholder="Enter officer passcode"
                  className="w-full p-2.5 pr-9 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] font-mono text-zinc-500">
                Authorized chapter sponsors & officers only. Default: <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 font-bold">beta4216</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Verifying...' : 'Unlock Officer Dashboard'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
