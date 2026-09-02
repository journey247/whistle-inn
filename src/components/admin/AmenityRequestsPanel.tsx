"use client";

import { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';

interface AmenityRequest {
    id: string;
    status: string;
    amenity: {
        name: string;
        price: number;
    };
    booking: {
        id: string;
        guestName: string;
        email: string;
    };
}

export function AmenityRequestsPanel() {
    const [requests, setRequests] = useState<AmenityRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const t = localStorage.getItem('admin_token');
        setToken(t);
        fetchRequests(t);
    }, []);

    const fetchRequests = async (authToken?: string | null) => {
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
            const res = await fetch('/api/admin/amenity-requests', { headers });
            if (!res.ok) throw new Error('Failed to fetch amenity requests');
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch amenity requests:', error);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await fetch(`/api/admin/amenity-requests/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status })
            });
            fetchRequests(token);
        } catch (error) {
            console.error('Failed to update amenity request:', error);
        }
    };

    if (loading) return <div>Loading...</div>;

    if (requests.length === 0) {
        return <p className="text-slate-600 text-sm">No amenity requests yet.</p>;
    }

    return (
        <div className="space-y-4">
            {requests.map(request => (
                <div key={request.id} className="bg-white p-4 rounded shadow">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium">{request.amenity.name} - ${request.amenity.price}</p>
                            <p className="text-sm text-gray-600">Guest: {request.booking.guestName} ({request.booking.email})</p>
                            <p className="text-sm">Status: {request.status}</p>
                        </div>
                        <div className="flex gap-2">
                            {request.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => updateStatus(request.id, 'approved')}
                                        className="bg-green-500 text-white px-3 py-1 rounded flex items-center gap-1"
                                    >
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button
                                        onClick={() => updateStatus(request.id, 'completed')}
                                        className="bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-1"
                                    >
                                        <Clock size={16} /> Complete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
