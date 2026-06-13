import React from 'react'

const Success = () => {
  return (
    <main className="min-h-screen bg-green-100 flex items-center justify-center font-mono">
      <div className="bg-white rounded-sm shadow p-6 flex flex-col gap-4 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1> 
        <p className="text-gray-700">Thank you for your purchase. Your subscription is now active.</p>
        <a href="/profile" className="mt-4 inline-block bg-green-600 text-white py-2 px-4 rounded-lg">Go to Profile</a>
      </div>
    </main>
  )
}

export default Success