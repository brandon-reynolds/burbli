      {/* CTAs */}
      {variant === "default" ? (
        <section className="mt-8 flex flex-wrap gap-2">
          <a
            href="/submit"
            className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
          >
            Share your project
          </a>
          <button
            onClick={copyLink}
            className="px-4 py-2 rounded-xl border hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </section>
      ) : (
        <section className="mt-8 border-t pt-4">
          <p className="text-[13px] text-gray-600">
            Had something similar done in {job.suburb}? Share it to help neighbours know what to expect.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="/submit"
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
            >
              Share your project
            </a>
            <button
              onClick={copyLink}
              className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </section>
      )}
