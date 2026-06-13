import React from 'react'

const Cancel = () => {
  return (
    <main className="min-h-screen bg-red-100 flex items-center justify-center font-mono">
      <div className="bg-white rounded-sm shadow p-6 flex flex-col gap-4 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600">Subscription Cancelled</h1>
        <p className="text-gray-700">Your subscription has been cancelled. We're sorry to see you go!</p>
        <a href="/profile" className="mt-4 inline-block bg-red-600 text-white py-2 px-4 rounded-lg">Go to Profile</a>
      </div>
    </main>
  )
}

export default Cancel