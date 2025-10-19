# systems/management/commands/run_listener.py
from django.core.management.base import BaseCommand
import asyncio
from systems.event_handler import EventHandler, CreateEventHandler, TradeEventHandler
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


class Command(BaseCommand):
    help = 'Run Solana event listener with batching support'

    def add_arguments(self, parser):
        parser.add_argument(
            '--mode',
            type=str,
            default='all',
            choices=['all', 'creates', 'trades'],
            help='Listener mode: all, creates, or trades only'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Number of events before forcing batch processing'
        )
        parser.add_argument(
            '--batch-delay',
            type=float,
            default=0.5,
            help='Seconds to wait before processing batch'
        )
        parser.add_argument(
            '--no-batching',
            action='store_true',
            help='Disable batching (process events immediately)'
        )

    def handle(self, *args, **options):
        mode = options['mode']
        batch_size = options['batch_size']
        batch_delay = options['batch_delay']
        enable_batching = not options['no_batching']

        self.stdout.write(self.style.SUCCESS(
            f'\n{"="*60}\n'
            f'Starting Solana Event Listener\n'
            f'{"="*60}\n'
            f'Mode:          {mode}\n'
            f'Batching:      {"Enabled" if enable_batching else "Disabled"}\n'
            f'Batch Size:    {batch_size}\n'
            f'Batch Delay:   {batch_delay}s\n'
            f'{"="*60}\n'
        ))

        # Choose handler based on mode
        if mode == 'creates':
            handler = CreateEventHandler(
                batch_size=batch_size,
                batch_delay=batch_delay,
                enable_batching=enable_batching
            )
            self.stdout.write(self.style.SUCCESS(
                '📝 Processing CREATE events only\n'
            ))
        elif mode == 'trades':
            handler = TradeEventHandler(
                batch_size=batch_size,
                batch_delay=batch_delay,
                enable_batching=enable_batching
            )
            self.stdout.write(self.style.SUCCESS(
                '💱 Processing TRADE events only (BUY/SELL)\n'
            ))
        else:
            handler = EventHandler(
                batch_size=batch_size,
                batch_delay=batch_delay,
                enable_batching=enable_batching
            )
            self.stdout.write(self.style.SUCCESS(
                '🌐 Processing ALL event types\n'
            ))

        # Run the listener
        try:
            asyncio.run(handler.run_listener())
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING(
                '\n\n⚠️  Keyboard interrupt received. Shutting down gracefully...\n'
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'\n\n❌ Error: {e}\n'
            ))
            raise