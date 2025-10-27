'use client';

import { useEffect, useState } from 'react';
import { formatE164ToUS } from '@/utils/formatters';

export interface ProfileData {
  name: string;
  email: string;
  crmApiKey: string;
  phoneNumber?: string;
}

const defaultProfile: ProfileData = {
  name: '',
  email: '',
  crmApiKey: '',
  phoneNumber: '',
};

interface UserProfileFormProps {
  initialData?: ProfileData | null;
  onProfileSaved?: (data: ProfileData) => void;
}

export default function UserProfileForm({ initialData, onProfileSaved }: UserProfileFormProps) {
  const [profile, setProfile] = useState<ProfileData>(initialData ?? defaultProfile);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;
    setProfile(initialData);
    setIsLoading(false);
  }, [initialData]);

  useEffect(() => {
    if (initialData) return;

    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) throw new Error('Unable to load profile information.');

        const data = (await response.json()) as Partial<ProfileData>;
        if (isMounted) {
          setProfile({
            name: data.name ?? '',
            email: data.email ?? '',
            crmApiKey: data.crmApiKey ?? '',
            phoneNumber: data.phoneNumber ?? '',
          });
        }
      } catch (error) {
        if (isMounted) {
          setFeedback(error instanceof Error ? error.message : 'Failed to load profile.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [initialData]);

  const handleChange = (field: keyof ProfileData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          crmApiKey: profile.crmApiKey,
        }),
      });

      if (!response.ok) throw new Error('Unable to save profile.');

      const updated: ProfileData = {
        name: profile.name,
        email: profile.email,
        crmApiKey: profile.crmApiKey,
        phoneNumber: profile.phoneNumber,
      };

      setFeedback('Profile updated successfully.');
      onProfileSaved?.(updated);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">Profile</h2>
      {feedback && <p className="mb-4 text-sm text-accent">{feedback}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="profile-name">
            Name
          </label>
          <input
            id="profile-name"
            type="text"
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2"
            value={profile.name}
            onChange={handleChange('name')}
            placeholder="Enter your name"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 opacity-60"
            value={profile.email}
            readOnly
          />
          <p className="text-xs text-muted-foreground mt-1">
            Email updates require contacting support to ensure account security.
          </p>
        </div>

        {/* Phone Number (read-only) */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="profile-phone">
            Phone Number
          </label>
          <input
            id="profile-phone"
            type="text"
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 opacity-60"
            value={formatE164ToUS(profile.phoneNumber)}
            readOnly
          />
          <p className="text-xs text-muted-foreground mt-1">
            This number is automatically linked to your account.
          </p>
        </div>

        {/* CRM API Key */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="profile-crm-key">
            CRM API Key
          </label>
          <input
            id="profile-crm-key"
            type="text"
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2"
            value={profile.crmApiKey}
            onChange={handleChange('crmApiKey')}
            placeholder="Enter your CRM API key"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 transition"
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
