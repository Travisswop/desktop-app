'use client';
import { withAuth } from '@/lib/withAuth';
import React from 'react';

const Feed: React.FC = () => {
  const posts = [
    { id: 1, content: 'First post!' },
    { id: 2, content: 'Second post!' },
    { id: 3, content: 'Third post!' },
  ];

  return (
    <div className="">
      <h1>Feed</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.content}</li>
        ))}
      </ul>
    </div>
  );
};

export default withAuth(Feed);
