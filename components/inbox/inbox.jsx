'use client';
import { Inbox as InboxIcon } from 'lucide-react';
export function Inbox() {
    return (<div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <InboxIcon className="w-24 h-24 text-gray-300 mb-4"/>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Inbox</h2>
      <p className="text-gray-500 text-center">You have no new messages from your Agent&apos;s Activities</p>
    </div>);
}
