import React, { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { Button, Input, Label } from '@repo/ui';
import { RenameModal, DeleteModal } from '@/components/drive/drive-modals';
import { DriveToastStack } from '@/components/drive/drive-toast';
import { HardDrive, User, LogOut } from 'lucide-react';

export function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { filebase, actionBusy, onRenameDrive, onDeleteDrive } = useDrive();

  const [renameDriveOpen, setRenameDriveOpen] = useState(false);
  const [deleteDriveConfirmOpen, setDeleteDriveConfirmOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <DriveToastStack />

      <div className="w-full max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your account and workspace preferences.
            </p>
          </div>
          <a
            href="/drive"
            className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline"
          >
            ← Back to Drive
          </a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800">Profile</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={user.name || ''} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} readOnly className="bg-slate-50" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800">Drive Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {filebase ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">Drive Name</h3>
                    <p className="text-sm text-slate-500">{filebase.name}</p>
                  </div>
                  <Button variant="outline" onClick={() => setRenameDriveOpen(true)}>
                    Rename
                  </Button>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-rose-600">Danger Zone</h3>
                    <p className="text-sm text-slate-500">
                      Permanently delete your entire drive and all contents.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setDeleteDriveConfirmOpen(true)}>
                    Delete Drive
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-slate-500 text-sm">
                No active drive found. Please visit the Drive to initialize it.
              </div>
            )}
          </div>
        </div>
      </div>

      <RenameModal
        open={renameDriveOpen}
        itemName={filebase?.name ?? ''}
        busy={actionBusy}
        onClose={() => setRenameDriveOpen(false)}
        onSubmit={(name) => {
          void onRenameDrive(name);
          setRenameDriveOpen(false);
        }}
      />

      <DeleteModal
        open={deleteDriveConfirmOpen}
        itemName={filebase?.name ?? ''}
        busy={actionBusy}
        onClose={() => setDeleteDriveConfirmOpen(false)}
        onConfirm={() => {
          void onDeleteDrive(user.name);
          setDeleteDriveConfirmOpen(false);
        }}
      />
    </div>
  );
}
