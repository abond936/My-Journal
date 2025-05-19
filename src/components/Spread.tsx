'use client';

import React from 'react';
import Image from 'next/image';

export function Spread() {
  return (
    <div className="spread-container">
      <div className="spread-page">
        <h1 className="heading-title">A Simple Test Page</h1>

        <div className="columns">
          <div className="column">
            <h2 className="heading-question">Column 1: A Good Question</h2>
            <p className="paragraph dropcap">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. lorem*6
              Lorem ipsum dolor sit amet consectetur, adipisicing elit. Omnis magnam eligendi ut amet eos, quisquam maxime corrupti ex recusandae consequatur labore libero, odio saepe iure, dicta hic architecto laboriosam ea.
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Autem officia ratione laudantium rerum in, aliquam, adipisci dolores labore id sit totam, facere sapiente accusantium facilis delectus distinctio eligendi nisi alias.
              Consequatur repellendus, est, similique minima odio quos autem a enim vero nisi sapiente. Expedita soluta, eligendi modi amet, obcaecati enim quam temporibus quasi, nobis eos nam sed voluptas voluptate iure?

            </p>
            <div className="callout-intra">
              This is a callout note within Column 1.
            </div>
            <Image
              src="/images/test-image-left.jpg"
              alt="Test Left"
              width={300}
              height={200}
              className="img-float-left"
            />
            <p className="paragraph">
              Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris.
            </p>
          </div>

          <div className="column">
            <h2 className="heading-story">Column 2: A Story Worth Telling</h2>
            <p className="paragraph">
              Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla.
            </p>
            <div className="post-it">
              <h4>Key Takeaways</h4>
              <ul>
                <li>Point one</li>
                <li>Point two</li>
              </ul>
            </div>
            <Image
              src="/images/test-image-right.jpg"
              alt="Test Right"
              width={300}
              height={200}
              className="img-float-right"
            />
            <p className="paragraph">
              Class aptent taciti sociosqu ad litora torquent per conubia nostra.
            </p>
          </div>
        </div>

        <div className="callout-cent">
          "A centered quote or insight that spans the full width."
        </div>

        <Image
          src="/images/test-image-wide.jpg"
          alt="Wide Image"
          width={1200}
          height={400}
          className="img-spread-wide"
        />
      </div>
    </div>
  );
}
